const axios = require('axios');
const bluebird = require("bluebird");
const _ = require('lodash');

class Adesa {

    constructor(options) {
        this.fs = options.fs;
        this.feedName = options.feedName;
        this.C = options.C;
        this.DBConfig = options.DBConfig;
        this.log = options.log;
        this.helper = options.helper;

        this.totalVehicles = 0;
        this.scrapedVehicles = 0;
    }

    async getAvailableVehicles(year) {
        try {
            let apiUrl = [
                this.C.app_url,
                "/api/search/vehicles/available",
                "?feed-id=7",
                "&includes=id,vin,year,heading,pricing",
                "&year=" + year,
            ].join("");

            this.log.logScraper("Getting available vehicles from database : " + apiUrl + "...");
            let availableVehicles = [];
            await axios.get(apiUrl)
                .then(response => {
                    availableVehicles = response.data;
                })
                .catch(error => {
                    return [];
                });
            
            return availableVehicles;
        } catch (error) {
            
            return [];
        }
    }
    /**
     * 
     * @param {*} C 
     * @returns boolean
     */
     isDetailPage(C) {
        let $ = jQuery;
        if ($(C.adesa.selectors.search_details.img_first_vehicle_slider).length >= 1) return true;

        return false;
    }

    /**
     * Login page -> do the login
     * @param {*} page 
     * @returns 
     */
    async login(page) {
        try {
            await page.waitForSelector(this.C.adesa.selectors.login.form, {timeout: this.C.timeout})
            // input username/password to its expected element
            this.log.logScraper("Inputting username/password...");
            await page.click(this.C.adesa.selectors.login.input_username);
            await page.keyboard.type(this.DBConfig.ADESA_ACCOUNT_USERNAME);
            await page.click(this.C.adesa.selectors.login.input_password);
            await page.keyboard.type(this.DBConfig.ADESA_ACCOUNT_PASSWORD);
            // await page.screenshot({path: 'screenshots/login2.png'});
            this.log.logScraper("Logging In...");
            await page.click(this.C.adesa.selectors.login.button_login);
            await page.waitForNavigation();
            await page.waitForSelector(this.C.adesa.selectors.homepage, {timeout: this.C.timeout})
            // Screeshot homepage
            this.log.logScraper("Logged In successfully");
            
            return 1;

        } catch (error) {
            // Re-Evaluate Page
            await page.addScriptTag({url: this.C.urls.jquery})
            let isRedirectedInDetailPage = await page.evaluate(this.isDetailPage, this.C);
            if (isRedirectedInDetailPage == true) {
                this.log.logScraper("Relogin Successful.");
                return 2;
            }

            this.log.logScraper("Unable to login-> Current URL: " + page.url());
            return 0;
        }
    }
    /**
     * building car summary search url
     * @param {*} year 
     * @returns string
     */
     getSearchUrl (year) {
        let searchIndexUrl = '';
            
        let index = this.DBConfig.ADESA_INDEX_URL;
        let variables = this.C.adesa.urls.search.variables
        let urlParams = '';
        for(let key in variables) {
            urlParams += [
                key,
                "=",
                variables[key],
                "&"
            ].join("");
        }

        urlParams+="year=" + [year, '-', year].join("");

        searchIndexUrl = index + urlParams;

        return searchIndexUrl;
    }
    /**
         * Scrape car summary pagination
         * @param {*} C 
         * @returns array
         */
    scrapeIndexPages(C) {
        let $ = jQuery;
        try {
            let vehiclePages = [];
            let vehiclePaginationItems = $(C.adesa.selectors.search.li_pagination);
            vehiclePaginationItems.each( function () {
                let achorLink = $(this).find("a");
                vehiclePages.push({
                    page_value: achorLink.attr("data-page"),
                    page_display: achorLink.text(),
                    url: achorLink.attr("href"),
                });
            });

            if (vehiclePages.length < 1) {

                return [{
                    page_value: 0,
                    page_display: 1,
                    url: null,
                }];
            }

            return vehiclePages; // Return our data array
        } catch(err) {

            return [{
                page_value: 0,
                page_display: 1,
                url: null,
            }];
        }

    }
    /**
         * Scrape car vehicle initial data in car summary per pages
         * @param {*} C 
         * @returns array
         */
    scrapeIndex(C) {
        let $ = jQuery;
        let vehicleList = [];
        try {
            let vehicleWrapper = $(C.adesa.selectors.search.div_vehicle_wrapper);
            vehicleWrapper.each( function () {
                let vehicleLink = $(this).find(C.adesa.selectors.search.a_vehicle_link);
                let vehiclePricing = {};
                let bPrice = $(this).find(C.adesa.selectors.search.b_price);
                let isPricing = false;
                
                if (bPrice.length >= 1) {
                    isPricing = true;
                    bPrice.each( function () {
                        let bKey = $(this).parent().find(C.adesa.selectors.search.b_price_label).text().toLowerCase();
                        let bValue = $(this).text().toLowerCase();
                        vehiclePricing[bKey] = bValue;
                    });
                }
                
                let vehicleName = vehicleLink.text();
                let vehicleId = vehicleLink.attr("data-vin");
                let vehicleUrl = vehicleLink.attr("href");
                let vehicleTransmission = $(this).find(C.adesa.selectors.search.div_vehicle_transmission).text();
                let vehicleEngine = $(this).find(C.adesa.selectors.search.div_vehicle_engine).text();
                let vehicleDriveTrain = $(this).find(C.adesa.selectors.search.div_vehicle_drivetrain).text();
                
                let vehicle = {
                    name: vehicleName,
                    vin: vehicleId,
                    url: vehicleUrl,
                    transmission: vehicleTransmission,
                    engine: vehicleEngine,
                    drivetrain: vehicleDriveTrain,
                    pricing: vehiclePricing
                };

                vehicle['included'] = true;
                vehicle['reason'] = null;
                // Check if vehicle have pricing
                if (isPricing == false) {
                    vehicle['included'] = false;
                    vehicle['reason'] = 'no pricing';
                }
                // Check if vehicle have no buy pricing
                if (isPricing == true) {
                    if (typeof vehiclePricing['buy'] == 'undefined') {
                        vehicle['included'] = false;
                        vehicle['reason'] = 'no buy price';
                    }
                    else {
                        // used for rogue dealer - minimum is set
                        let scrapePriceLimit = C.scrape_price_limit;
                        // $49,500
                        let buyPrice = parseInt(String(vehiclePricing['buy']).replace(/[$,]/g,''));
                        if (buyPrice <= scrapePriceLimit) {
                            vehicle['included'] = false;
                            vehicle['reason'] = 'price too low';
                        }
                    }
                }

                vehicleList.push(vehicle);
            });

            return vehicleList; // Return our data array
        } catch(err) {
            
            return [];
        }
    }

    async buildIndex(year, firstLogin = false, browser) {
        let page = await browser.newPage();

        if (firstLogin == true) {
            // goto login page for login
            let loginURL = this.DBConfig.ADESA_LOGIN_URL;
            this.log.logScraper("Go to Login Page " + loginURL);
            await page.goto(loginURL, {waitUntil: 'load', timeout: this.C.timeout});
            await this.login(page);
        }

        let searchUrl = this.getSearchUrl(year);
        this.log.logScraper("Surfing: " + searchUrl);
        await page.goto(searchUrl, {waitUntil: 'load', timeout: this.C.timeout});
        await page.waitForSelector(this.C.adesa.selectors.search.div_vehicles, {timeout: this.C.timeout})
        await page.click(this.C.adesa.selectors.search.anchor_vehicle_limit);
        await page.waitForTimeout(3000)
        await page.click(this.C.adesa.selectors.search.input_radio_vehicle_limit);
        await page.waitForTimeout(3000)
        
        let vehiclePages = [];
        // Inject Jquery
        await page.addScriptTag({url: this.C.urls.jquery});

        try {
            await page.waitForSelector(this.C.adesa.selectors.search.a_vehicle_link, {visible: true, timeout: this.C.timeout});
            // collect pages
            vehiclePages = await page.evaluate(this.scrapeIndexPages, this.C);
        } catch (error) {

            this.log.logScraper("No vehicles found for " + year);
            return [];
        }

        // Collect vehicle data in each page
        let vehicles = [];
        let rawVehicles = [];

        this.log.logScraper([
            "Estimated Number of vehicles to be scraped: Less or Equal to ",
            (vehiclePages.length * 100)
        ].join(""));

        for (let index in vehiclePages) {

            if (index == 0) {
                // page.on('console', consoleObj => console.log(consoleObj.text())); // enable console.log inside evaluate
                rawVehicles = await page.evaluate(this.scrapeIndex, this.C);
            }
            else {
                rawVehicles = [];
    
                try {
                    let currentVehiclePage = vehiclePages[index];
    
                    let paramsUrl = currentVehiclePage['url'];
                    let searchIndexUrl = (this.C.adesa.urls.search.index).replace('?', '');
                    let nextUrl = [
                        searchIndexUrl,
                        paramsUrl,
                    ].join("");
                    this.log.logScraper("Surfing: " + nextUrl);
                    await page.goto(nextUrl, {waitUntil: 'load', timeout: this.C.timeout});
                    // await page.waitForTimeout(10000)
                    await page.waitForSelector(this.C.adesa.selectors.search.a_vehicle_link_image_loaded, {visible: true,timeout: this.C.timeout})
                    // Inject Jquery
                    await page.addScriptTag({url: this.C.urls.jquery})
                    rawVehicles = await page.evaluate(this.scrapeIndex, this.C);
    
                } catch (error) {
                    
                    let isLoginPage = await page.evaluate(this.isLoginPage, this.C);
                    if (isLoginPage == true) {
                        this.log.logScraper("Auth Session expired.");
                        this.log.logScraper("Process exit.");
                        process.exit(1);
                    }
                    else this.log.logScraper("Possible timeout");
                }
            }

            if (rawVehicles.length >= 1) {
                let logMsg = null;
                for (let subIndex in rawVehicles) {
                    let currentRawVehicle = rawVehicles[subIndex];
    
                    logMsg = [
                        currentRawVehicle['vin'],
                        currentRawVehicle['included'] == false ? currentRawVehicle['reason'] : null
                    ].join(" ");
    
                    this.log.logScraper(logMsg);
                }
    
                let filteredVehicles = rawVehicles.filter((vehicle) => vehicle['included'] == true);
    
                vehicles = [
                    ...vehicles,
                    ...filteredVehicles
                ];
            }
        }

        return vehicles;
    }

    isVinGoodForScraping(vin, pricing, availableDBVehicles) {
        let displayPrice = pricing['price'];

        if (availableDBVehicles.length >= 1) {
            let filtered = availableDBVehicles.filter( (vehicle) => {
                return vin == vehicle.vin;
            });
            
            if (filtered.length >= 1) {
                // vin is found in the database as available
                let filterPricing = filtered[0].pricing;
                let originalPrice = parseInt(filterPricing.price);

                // buyPrice = parseInt((String(buyPrice).replace(/\$/g, '').replace(/,/g, '')));
                // price have no update
                if (originalPrice == displayPrice) return 0;
                // price have been updated
                else return 2;
            }
        }

        let scrapePriceLimit = parseInt(this.C.scrape_price_limit);
        if (displayPrice <= scrapePriceLimit) {
            // rogue dealer
            return -1;
        }
        
        return 1;
    }

    /**
     * building car details search url
     * @param {*} year 
     * @returns string
     */
     getSearchDetailsUrl(detailUrl) {

        return [
            this.C.adesa.urls.base,
            detailUrl
        ].join("");
    }

    /**
     * Scrape car vehicle details images
     * @param {*} C 
     * @returns array
     */
     scrapeDetailImages(C) {
        let $ = jQuery;
        let imageList = [];
        try {
            let vehicleImageItem = $(C.adesa.selectors.search_details.modal_thumbnail_item);
            vehicleImageItem.each( function () {

                let img = $(this).find("img");
                let imgSrc = String(img.attr("src"));
                imgSrc = imgSrc.replace(/_th./g, '.');

                imageList.push(imgSrc);
            });

            return imageList;
        } catch (err) {
            return [];
        }
    }
    /**
     * Scrape car vehicle additional details
     * @param {*} C 
     * @returns array
     */
     scrapeAdditionalDetails(C) {
        let $ = jQuery;
        let additionalDetails = {};
        let buyPrice = null;
        let buyBid = null;
        try {
            buyPrice = $(C.adesa.selectors.search_details.button_buy_price).text();
        } catch (error) {}

        try {
            buyBid = $(C.adesa.selectors.search_details.button_bid_price).text();
        } catch (error) {}

        let pricing = {
            buy: buyPrice,
            bid: buyBid,
        };
        
        let locationCity = null;
        let locationState = null;

        try {
            locationCity = $(C.adesa.selectors.search_details.span_location_city).text();
        } catch (error) {}

        try {
            locationState = $(C.adesa.selectors.search_details.span_location_state).text();
        } catch (error) {}

        additionalDetails['pricing'] = pricing;
        additionalDetails['location'] = [
            locationCity,
            locationState
        ].join("");

        if ((additionalDetails['location']).trim() == '') {
            try {
                additionalDetails['location'] = $(C.adesa.selectors.search_details.span_location_city_state).text();
            } catch (error) {}
        }

        let colorExterior = null;
        let colorInterior = null;
        let mileage = null;

        try {
            colorExterior = $(C.adesa.selectors.search_details.div_exterior_color).attr(C.adesa.selectors.search_details.div_exterior_color_attr);
        } catch (subError) {}
        console.log(colorExterior);
            
        try {
            colorInterior = $(C.adesa.selectors.search_details.div_interior_color).attr(C.adesa.selectors.search_details.div_interior_color_attr);
        } catch (subError) {}
            
        additionalDetails['colors'] = {
            'exterior': colorExterior,
            'interior': colorInterior,
        };

        try {
             mileage = $(C.adesa.selectors.search_details.div_info_odometer).attr(C.adesa.selectors.search_details.div_info_odometer_attr)
        } catch (subError) {}

        additionalDetails['mileage'] = mileage;
        let fuelType = null;
        let bodyStyle = null;
        let doors = null;
        try {
            fuelType = $(C.adesa.selectors.search_details.p_info_fuel_type).first().text();
        } catch (error) {}
        
        try {
            bodyStyle = $(C.adesa.selectors.search_details.p_info_body_style).first().text();
        } catch (error) {}
        
        try {
            doors = $(C.adesa.selectors.search_details.p_info_doors_value).text();
        } catch (error) {}

        let stockNo = null;
        try {
            stockNo = $(C.adesa.selectors.search_details.span_stock_no).text();
        } catch (error) {}

        let damages = null;
        try {
            damages = $(C.adesa.selectors.search_details.span_damages).text();
        } catch (error) {}

        additionalDetails['fuel_type'] = fuelType;
        additionalDetails['body_style'] = bodyStyle;
        additionalDetails['doors'] = doors;
        additionalDetails['stock_no'] = stockNo;
        additionalDetails['damages'] = damages;

        return additionalDetails;
    }

    /**
     * Check if auth session expired
     * @param {*} C 
     * @returns boolean
     */
     isLoginPage(C) {
        if(document.body.contains(document.getElementById('accountName'))){
            return true;
        }

        return false;
    }

    async crawlForImageAndAdditionalDetails(vehicles, availableVehicles, feed, browser) {

        let currentVehicle = {};

        for (let index2 in vehicles) {

            currentVehicle = vehicles[index2];
            // Check vin if exist in collection
            let vin = currentVehicle['vin'];
            let vinsFile = feed.getFileNameVinsFile(vin);
    
            if (feed.isFileNameVinsFileExist(vin, this.currentYear) == true) {
                this.log.logScraper(vin + " have already been scraped. skipping this vehicle.", false, "info");
                // delete vehicle
                delete vehicles[index2];
                continue;
            }
    
            let displayPrice = parseInt(String(currentVehicle['pricing']['buy']).replace(/[$,]/g,''));
            let pricing = {
                'price': displayPrice
            };
            
            let isGoodForScraping = this.isVinGoodForScraping(vin, pricing, availableVehicles);
            // Check if vin exist in db available vehicle and check if price changed
            if (isGoodForScraping == 0) {
                this.log.logScraper(vin + " is already availble in database and has no price changed.", false, "info");
                // delete vehicle
                delete vehicles[index2];
                continue;
            }
            // price have been updated
            else if (isGoodForScraping == 2) {
                this.log.logScraper(vin + " is already availble in database and price have been updated.", false, "info");
            }
            // Rogue dealer found
            else if (isGoodForScraping == -1) {
                this.log.logScraper(vin + " rogue dealer found. Price: " + displayPrice, false, "error");
                // delete vehicle
                delete vehicles[index2];
                continue;
            }

        }

        vehicles = vehicles.filter( (vehicle) => typeof vehicle['url'] != 'undefined');
        
        try {
            // Multiple Tabs
            const results = await feed.withBrowser(async (browser) => {
                return bluebird.map(vehicles, async (currentVehicle, index) => {
                    return feed.withPage(browser)(async (page) => {
                        // Do not load images to prevent storage issue
                        await page.setRequestInterception(true);
                        page.on('request', (request) => {
                            if (['image'].indexOf(request.resourceType()) !== -1) {
                                // Mock image for fast loading and trick display triggers in details page
                                request.respond({
                                    status: 200,
                                    contentType: 'image/png',
                                    body: Buffer.from(this.C.image.base64_data, 'base64')
                                });
                            }
                            else request.continue();
                        });

                        let searchDetailUrl = this.getSearchDetailsUrl(currentVehicle['url']);

                        try {
                            
                            let vin = currentVehicle['vin'];
                            let vinsFile = feed.getFileNameVinsFile(vin, this.currentYear);

                            this.log.logScraper(vin + " Surfing & Scraping additional details...");
                            await page.goto(searchDetailUrl, {waitUntil: 'load', timeout: this.C.timeout});
                            // await page.waitForSelector(C.selectors.search_details.div_vehicle_slider)
                            await page.waitForSelector(this.C.adesa.selectors.search_details.img_first_vehicle_slider, {timeout: this.C.timeout})
                            await page.click(this.C.adesa.selectors.search_details.img_first_vehicle_slider);
                            // open modal images
                            await page.waitForSelector(this.C.adesa.selectors.search_details.modal_thumbnail_item)
                            // Inject Jquery
                            await page.addScriptTag({url: this.C.urls.jquery})
                            // collect images
                            let vehicleImages = await page.evaluate(this.scrapeDetailImages, this.C);
                            await page.click(this.C.adesa.selectors.search_details.modal_thumbnail_close);
                            // page.on('console', consoleObj => console.log(consoleObj.text())); // enable console.log inside evaluate
                            let vehicleAdditionalDetails = await page.evaluate(this.scrapeAdditionalDetails, this.C);

                            currentVehicle['images'] = vehicleImages;
                            currentVehicle['additional_details'] = vehicleAdditionalDetails;

                            // Save data as json file
                            await feed.saveJsonToVinsFile(currentVehicle, vinsFile);
                            
                            // delete vehicle
                            delete vehicles[index];

                            // update count index
                            this.scrapedVehicles++;

                            this.log.logScraper(this.scrapedVehicles + "/" + this.totalVehicles + " : " + vin + " >>>> Scraped!");

                        } catch (subError) {
                            this.log.logScraper(subError);

                            let isLoginPage = await page.evaluate(this.isLoginPage, this.C);
                            if (isLoginPage == true) {
                                this.log.logScraper("Auth Session expired.");
                                this.log.logScraper("Attempting to relogin...");

                                let isRelogin = await this.login(page);
                                if (isRelogin == 1 || isRelogin == 2) {
                                    // Recrawl the remaining vehicles
                                    await this.crawlForImageAndAdditionalDetails(vehicles, availableVehicles, feed, browser);
                                }
                                else process.exit(0);
                            }
                            else {
                                
                                this.log.logScraper("Possible timeout " + searchDetailUrl);
                                // delete vehicle
                                delete vehicles[index];
                            }
                        }


                    });
                }, {concurrency: this.C.maximum_tabs});
            }, browser);
            
        } catch (error) {
            
            return;
        }
    }

    async collectScrapedVins(feed) {
        let pathFiles = feed.getVinFiles(this.currentYear);

        let jsonData = [];
        let scrapedVins = [];
        for(let index in pathFiles) {
            jsonData = await feed.readJsonFile(pathFiles[index]);
            scrapedVins.push(jsonData);
        }
        
        return scrapedVins;
    }

    async start(year, firstLogin = false, currentAvailableVehicles, feed, browser) {
        this.scrapedVehicles = 0;
        this.currentYear = year;

        let availableVehicles = await this.getAvailableVehicles(year);
        this.log.logScraper(availableVehicles.length + " available vehicle(s) found.");

        // Scrape Vehicle Details - Images, additional details
       if (currentAvailableVehicles.length >= 1) {
            this.totalVehicles = currentAvailableVehicles.length;
            // Crawl for image & additional details
            await this.crawlForImageAndAdditionalDetails(currentAvailableVehicles, availableVehicles, feed, browser);

            // Collect Scraped vins
            let collectedVehicles = await this.collectScrapedVins(feed);

            let jsonFileName = feed.getJsonVehicleFileNameByYear(year);
        
            this.log.logScraper(collectedVehicles.length + " vehicle(s) have been saved into: " + jsonFileName, false, "info");
            // Save data as json file
            await feed.saveJsonFile(collectedVehicles, jsonFileName);
            // Move vehicle json file to storage file
            this.log.logScraper("Moving " + jsonFileName + " into " + this.C.adesa.feed_import_destination);
            await feed.moveFeedPerYearFile(jsonFileName, year);
            
            // Clean up scraped vins
            this.log.logScraper("Cleaning scraped vins...");
            feed.cleanUpScrapedVins(this.currentYear);
       }
       else {
            this.log.logScraper("No vehicles made it for year: " + year, false, "error");
       }
    }
}

module.exports = Adesa;