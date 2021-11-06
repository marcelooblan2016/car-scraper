const axios = require('axios');
const bluebird = require("bluebird");
const { exit } = require('browser-sync');
const _ = require('lodash');

class Carfax {

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
    
    async waitForImageLoad() {
        let images = document.querySelectorAll('img');
        
        function preLoad() {
            let promises = [];
            function loadImage(img) {
                return new Promise(function(resolve,reject) {
                    if (img.complete) {
                        resolve(img)
                    }
                    img.onload = function() {
                        resolve(img);
                    };
                    img.onerror = function(e) {
                        resolve(img);
                    };
                })
            }

            for (let i = 0; i < images.length; i++)
            {
                promises.push(loadImage(images[i]));
            }

            return Promise.all(promises);
        }

        return preLoad();
    }

    scrapeIndexPage(C) {
        let $ = jQuery;

        let vehicleVin = null;
        let vehicleTitle = null;
        let vehicleUrl = null;
        let vehiclePrice = null;
        let vehicles = [];
        let vehiclePhotoCount = 0;

        try {
            let articleVehicles = $(C.carfax.selectors.search_results.article_vehicle);

            articleVehicles.each( function () {
                vehicleVin = null;
                vehicleTitle = null;
                vehicleUrl = null;
                vehiclePrice = null;
                vehiclePhotoCount = 0;

                try {
                    vehicleVin = $(this).attr("data-vin");
                } catch (subError) {}

                try {
                    vehicleTitle = $(this).find(C.carfax.selectors.search_results.h4_vehicle_title).text();
                } catch (subError) {}
                
                try {
                    vehicleUrl = $(this).find(C.carfax.selectors.search_results.a_vehicle_link).attr("href");
                } catch (subError) {}

                try {
                    vehiclePrice = $(this).find(C.carfax.selectors.search_results.span_vehicle_price).text();
                    vehiclePrice = vehiclePrice.replace('Price: ', '')
                        .replace('$', '')
                        .replace(',', '');
                    
                    vehiclePrice = parseInt(vehiclePrice);
                    if(isNaN(vehiclePrice)) {
                        vehiclePrice = null;
                    }

                } catch (subError) {}

                try {
                    let rawPhotoCount = $(this).find(C.carfax.selectors.search_results.span_photo_count).text().replace('Photos', '').replace('Photo', '').trim();

                    vehiclePhotoCount = parseInt(rawPhotoCount);
                } catch (subError) {}
             
                vehicles.push({
                    vin: vehicleVin,
                    title: vehicleTitle,
                    url: vehicleUrl,
                    price: vehiclePrice,
                    photo_count: vehiclePhotoCount,
                });
            });
            
            if (vehicles.length < 1) {
                return [];
            }

            return vehicles;

        } catch (err) {

            return null;
        }
    }

    scrapeInitialPageInfo(C) {
        let $ = jQuery;
        try {
            let totalCount = $(C.carfax.selectors.search_results.span_total_result_count).text().replace(',', '');
            let vehicleCard = $(C.carfax.selectors.search_results.article_vehicle);

            return {
                total_count: parseInt(totalCount),
                per_page_count: vehicleCard.length,
            };

        } catch(err) {
            console.log("ERROR: " + err);

            return {
                total_count: 0,
                per_page_count: 0,
            };
        }
    }
    /**
     *  Build Vehicles from expose api of enterprise
     */
    async buildIndex(currentYear, yearCount, context) {
        currentYear = (currentYear).toString();

        let page = await context.newPage();
        let width = this.C.resolution.width;
        let height = this.C.resolution.height;

        await page.setViewport({
            width: width,
            height: height,
        });

        let indexUrl = this.DBConfig.CARFAX_INDEX_URL;
        // login
        await page.goto(indexUrl, {waitUntil: 'load', timeout: this.C.timeout});
        await page.waitForTimeout(3000);

        // Check if not logged in
        // Inject Jquery
        await page.addScriptTag({url: this.C.urls.jquery});

        let isLoggedIn = await page.evaluate(this.isLoggedIn, this.C);
        this.log.logScraper(isLoggedIn);
        
        if (isLoggedIn == false) {
            this.log.logScraper("Not Logged In.");
            await page.waitForSelector(this.C.carfax.selectors.sign_in.header_sign, {timeout: this.C.timeout, visible: true});
            this.log.logScraper("Login");
            await page.click(this.C.carfax.selectors.sign_in.header_sign);
            await page.waitForTimeout(3000);
            let username = this.DBConfig.CARFAX_USERNAME;
            let password = this.DBConfig.CARFAX_PASSWORD;
            this.log.logScraper(`Filling credentials..., username:${username} password: ${password}`);
            await page.click(this.C.carfax.selectors.sign_in.input_email);
            await page.keyboard.type(username);
            await page.click(this.C.carfax.selectors.sign_in.input_password);
            await page.keyboard.type(password);
    
            await page.click(this.C.carfax.selectors.sign_in.button_login);
            await page.waitForTimeout(6000);
        }
        else {
            this.log.logScraper("Logged In.");
        }

        this.log.logScraper(`Goto Index Url: ${indexUrl}`);

        let bodyTypes = this.C.carfax.options.body_type_values;
        let bodyTypeValue = null;
        let vehicles = [];
        let maxPerBodyType = this.C.carfax.options.max_limit_per_body_type;
        for (let bodyTypeIndex in bodyTypes) {

            let bodyTypeVehicles = [];

            bodyTypeValue = bodyTypes[bodyTypeIndex];
            this.log.logScraper("Filling up body style form for : " + bodyTypeValue);
           
            await page.goto(indexUrl, {waitUntil: 'load', timeout: this.C.timeout});
            // Step 1
            try {
                await page.waitForTimeout(3000);
                await page.waitForSelector(this.C.carfax.selectors.car_for_sale.li_body_type_panel, {timeout: this.C.timeout, visible: true});
                await page.click(this.C.carfax.selectors.car_for_sale.li_body_type_panel);
                await page.waitForTimeout(2000);
                await page.select(this.C.carfax.selectors.car_for_sale.select_body_type, bodyTypeValue);
                await page.waitForTimeout(2000);
                await page.click(this.C.carfax.selectors.car_for_sale.input_zip);
                await page.keyboard.type( (this.DBConfig.CARFAX_ZIP).toString() );
                await page.click(this.C.carfax.selectors.car_for_sale.button_submit);
            }
            catch (error) {
                await page.screenshot({path: 'error.png'});
                this.log.logScraper("ERRROR: " + error);
                const fs = require('fs-extra');
    
                const html = await page.content();
                await fs.outputFile('error.html', html);
                process.exit(1);
            }
            // Step 2

            // wait for 5 seconds as we cannot track the element on loading
            await page.waitForTimeout(5000);

            let li_lists = await page.$$(this.C.carfax.selectors.car_for_sale.checkbox_list);
            for (let li of li_lists) {
                await li.click();
            }

            // go to search results
            await page.click(this.C.carfax.selectors.car_for_sale.button_search_results);
            // Results page
            this.log.logScraper("Getting results ...");
           
            await page.waitForSelector(this.C.carfax.selectors.search_results.span_total_results_count, {waitUntil: 'load', timeout: this.C.timeout});
            // wait for all images to load
            await page.evaluate(this.waitForImageLoad);

            // select year
            this.log.logScraper("Selecting by year min-max: " + currentYear);

            await page.select(this.C.carfax.selectors.search_results.select_minimum_year, currentYear);
            await page.waitForTimeout(2000);
            await page.evaluate(this.waitForImageLoad);
            await page.select(this.C.carfax.selectors.search_results.select_maximum_year, currentYear);
            await page.waitForTimeout(2000);
            await page.evaluate(this.waitForImageLoad);

            // scrape Car summary
            // Inject Jquery
            await page.addScriptTag({url: this.C.urls.jquery});
            let pageInfo = await page.evaluate(this.scrapeInitialPageInfo, this.C);

            let totalPages = pageInfo.total_count <= pageInfo.per_page_count ? 1 : (function (totalCount, perPageCount) {
                
                return totalCount / perPageCount % 2 == 0 ? parseInt(totalCount / perPageCount) : parseInt(totalCount / perPageCount) + 1;
            })(pageInfo.total_count, pageInfo.per_page_count);

            console.log("Total pages: " + totalPages);
            // for testing
            // page.on('console', consoleObj => console.log(consoleObj.text()));
            bodyTypeVehicles = await page.evaluate(this.scrapeIndexPage, this.C);

            for(let pageIndex = 1; pageIndex <= totalPages; pageIndex++) {

                if (pageIndex == 1) {
                    continue;
                }
                // Click next page Wait to load..
                await page.click(this.C.carfax.selectors.search_results.button_pagination_next);
                await page.waitForTimeout(3000);
                await page.evaluate(this.waitForImageLoad);

                let nextPageVehicles = await page.evaluate(this.scrapeIndexPage, this.C);

                bodyTypeVehicles = [
                    ...bodyTypeVehicles,
                    ...nextPageVehicles,
                ];
            }

            // map url & filtering
            let homeUrl = this.DBConfig.CARFAX_HOME_URL;

            bodyTypeVehicles = bodyTypeVehicles.map( function (vehicle) {
                vehicle['url'] = [
                    homeUrl,
                    (vehicle['url']).replace('/', ''),
                ].join('');

                return vehicle;
            }).filter( function (vehicle) {

                if (vehicle['price'] == null) {return false};
                if (parseInt(vehicle['photo_count']) < 3 || vehicle['photo_count'] == null) {return false};
                
                return true;
            });
            
            
            if (bodyTypeVehicles.length > maxPerBodyType) {
                bodyTypeVehicles = bodyTypeVehicles.slice(0, maxPerBodyType);
                continue;
            }
            
            this.log.logScraper("Vehicles for " + bodyTypeValue + " : " + bodyTypeVehicles.length);

            vehicles = [
                ...vehicles,
                ...bodyTypeVehicles,
            ];
            
            // prevent page block
            let timeOut = 60000; // 1 minute
            this.log.logScraper("Waiting... to prevent page block. " + timeOut + " ms");
            await page.waitForTimeout(timeOut);
        }

        return vehicles;
    }

    async getAvailableVehicles(year) {
        try {
            let apiUrl = [
                this.C.app_url,
                "/api/search/vehicles/available",
                "?feed-id=9",
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

    isLoggedIn(C) {
        let $ = jQuery;
        return $(C.carfax.selectors.sign_in.logout+":visible").length >= 1 ? true : false;
    }

    scrapeDetailsImageCount(C) {
        let $ = jQuery;
        try {
            return $(C.carfax.selectors.search_details.div_slide).length;
        } catch (error) {
            return 0;
        }
    }

    scrapeDetailsImage(C) {
        let $ = jQuery;
        try {
            let vehicleImages = [];
            $(C.carfax.selectors.search_details.div_slide).each( function () {
                let img = $(this).find("img");

                vehicleImages.push(img.attr("src"));
            });
            
            return vehicleImages;
        } catch (error) {
            return [];
        }
    }

    scrapeDetailsImageByModal(C) {
        let $ = jQuery;
        try {
            let vehicleImages = [];
            $(C.carfax.selectors.search_details.modal_div_slide).each( function () {
                let img = $(this).find("img");

                vehicleImages.push(img.attr("src"));
            });
            
            return vehicleImages;
        } catch (error) {
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
        // vehicle info
        let vehicleInfo = [
            {'key': 'price', 'match': /Price/, 'replace': 'Price'},
            {'key': 'location', 'match': /Location/, 'replace': 'Location'},
            {'key': 'mileage', 'match': /Mileage/, 'replace': 'Mileage'},
            {'key': 'interior_color', 'match': /Interior Color/, 'replace': 'Interior Color'},
            {'key': 'exterior_color', 'match': /Exterior Color/, 'replace': 'Exterior Color'},
            {'key': 'transmission', 'match': /Transmission/, 'replace': 'Transmission'},
            {'key': 'body_style', 'match': /Body Style/, 'replace': 'Body Style'},
            {'key': 'engine', 'match': /Engine/, 'replace': 'Engine'},
            {'key': 'fuel', 'match': /Fuel/, 'replace': 'Fuel'},
            {'key': 'vin', 'match': /VIN/, 'replace': 'VIN'},
            {'key': 'stock_', 'match': /Stock #/, 'replace': 'Stock #'},
        ];

        let vehicleInfoContainer = $(C.carfax.selectors.search_details.div_vehicle_info_location_container);
        let liContainer = vehicleInfoContainer.find("ul li");
        liContainer.each( function () {
              let liText = $(this).text();
              for (let index in vehicleInfo) {
                let matches = liText.match(vehicleInfo[index]['match']);
                if (matches != null) {
                  additionalDetails[vehicleInfo[index]['key']] = liText.replace(vehicleInfo[index]['replace'], '').trim();
                }
              }
        });
        
        additionalDetails['contact'] = {
            'phone': null,
            'name': null,
        };
        
        try {
            additionalDetails['contact']['phone'] = $(C.carfax.selectors.search_details.div_dealer_info_phone + ":first").text();
        } catch (error) {}

        try {
            additionalDetails['contact']['name'] = $(C.carfax.selectors.search_details.div_dealer_info_name).text();
        } catch (error) {}

        return additionalDetails;
    }

    async collectScrapedVins(feed) {
        let pathFiles = feed.getVinFiles(this.currentyear);

        let jsonData = [];
        let scrapedVins = [];
        for(let index in pathFiles) {
            jsonData = await feed.readJsonFile(pathFiles[index]);
            scrapedVins.push(jsonData);
        }
        
        return scrapedVins;
    }

    async scrapeDetailsPage(currentVehicle, page, feed) {

        let pageStatus = 200;

        try {

            let vin = currentVehicle['vin'];

            let vinsFile = feed.getFileNameVinsFile(vin, this.currentyear);
    
            let detailUrl = currentVehicle['url'];
    
            this.log.logScraper(vin + " Surfing & Scraping additional details: " + detailUrl);
    
            const response = await page.goto(detailUrl, {waitUntil: 'load', timeout: this.C.timeout});
            pageStatus = response.status();
    
            await page.waitForSelector(this.C.carfax.selectors.search_details.div_image_container, {timeout: this.C.timeout});
            // wait for all images to load
            await page.evaluate(this.waitForImageLoad);
    
            // Inject Jquery
            await page.addScriptTag({url: this.C.urls.jquery});
            
            // scrape additional details
            let vehicleAdditionalDetails = await page.evaluate(this.scrapeAdditionalDetails, this.C);
    
            currentVehicle['additional_details'] = vehicleAdditionalDetails;

            let imageCount = await page.evaluate(this.scrapeDetailsImageCount, this.C);
            
            let scrapeMethod = 1;
            currentVehicle['images'] = [];
    
            if (imageCount >= 1) {
                if (scrapeMethod == 1) {
                    /*
                    * method 1 - slower but safer reduce the risk of being blocked
                    */
                    for(let imageIndex = 1; imageIndex < imageCount; imageIndex++) {
                        await page.click(this.C.carfax.selectors.search_details.button_gallery_next);
                        await page.waitForTimeout(1000);
                    }
    
                    currentVehicle['images'] = await page.evaluate(this.scrapeDetailsImage, this.C);
                }
                else if (scrapeMethod == 2) {
                    /*
                    * method 2 - faster but high risk of being block
                    */
    
                    await page.click(this.C.carfax.selectors.search_details.img_container);
                    // Wait for two seconds - prevent from being banned 
                    await page.waitForTimeout(2000);
                    currentVehicle['images'] = await page.evaluate(this.scrapeDetailsImageByModal, this.C);
                }
    
            }

            // Save data as json file
            await feed.saveJsonToVinsFile(currentVehicle, vinsFile);
            // update count index
            this.scrapedVehicles++;
    
            this.log.logScraper(this.scrapedVehicles + "/" + this.totalVehicles + " : " + vin + " " + detailUrl + " Scraped!");

            return 1;

        } catch (error) {

            if (pageStatus == 403) {
                // page block
                return 3;
            }

            return 2;
        }
    }

    async start(year, firstLogin = false, currentAvailableVehicles, feed, browser) {
        this.scrapedVehicles = 0;
        this.currentyear = year;
        let availableDBVehicles = await this.getAvailableVehicles(year);
        this.log.logScraper(availableDBVehicles.length + " available vehicle(s) found.");
        
        // Scrape Vehicle Details - Images, additional details
        let validVehicles = [];
        if (currentAvailableVehicles.length >= 1) {
            this.log.logScraper(currentAvailableVehicles.length + " vehicle(s) found in source.");
            for( let index in currentAvailableVehicles ) {
                let currentVehicle = currentAvailableVehicles[index];
                let vin = currentVehicle['vin'];

                // check vehicle if scraped already
                if (feed.isFileNameVinsFileExist(vin, this.currentyear) == true) {
                    this.log.logScraper(vin + " have already been scraped. skipping this vehicle.", false, "info");
                    // delete vehicle
                    delete currentAvailableVehicles[index];
                    continue;
                }

                // check record from db here...
                let displayPrice = parseInt(currentVehicle['price']);
                let pricing = {
                    'price': displayPrice
                };

                let isGoodForScraping = this.isVinGoodForScraping(vin, pricing, availableDBVehicles);

                // Check if vin exist in db available vehicle and check if price changed
                if (isGoodForScraping == 0) {
                    this.log.logScraper(vin + " is already available in database and has no price changed.", false, "info");
                    // delete vehicle
                    delete currentAvailableVehicles[index];
                    continue;
                }
                // price have been updated
                else if (isGoodForScraping == 2) {
                    this.log.logScraper(vin + " is already available in database and price have been updated.", false, "info");
                }
                // Rogue dealer found
                else if (isGoodForScraping == -1) {
                    this.log.logScraper(vin + " rogue dealer found. Price: " + displayPrice, false, "error");
                    // delete vehicle
                    delete currentAvailableVehicles[index];
                    continue;
                }

                validVehicles.push(currentVehicle);
            }

            if (validVehicles.length >= 1) {

                this.totalVehicles = validVehicles.length;
                this.vehicleTimeouts = [];

                // Multiple Tabs
                const results = await feed.withBrowser(async (browser) => {
                    return bluebird.map(validVehicles, async (currentVehicle, index) => {
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
                                // else if (['stylesheet', 'font'].indexOf(request.resourceType()) !== -1) request.abort();
                                else request.continue();
                            });

                            let vin = currentVehicle['vin'];

                            let detailUrl = currentVehicle['url'];
                            let timeOutVehicle = null;
                            // check if have timeout list
                            if (this.vehicleTimeouts.length >= 1) { 
                                try {
                                        this.log.logScraper("Retrying vehicle after page block.");
                                        timeOutVehicle = this.vehicleTimeouts[0];
                                        this.vehicleTimeouts = this.vehicleTimeouts.filter( function (vehicle) {

                                            return timeOutVehicle['vin'] != vehicle['vin'];
                                        });

                                        this.log.logScraper("Timeout vehicle Vin: " + timeOutVehicle['vin']);

                                        let scrapeDetailsPageResponse = await this.scrapeDetailsPage(timeOutVehicle, page, feed);

                                        if (scrapeDetailsPageResponse == 1) {}
                                        else if (scrapeDetailsPageResponse == 2) { throw 404; }
                                        else if (scrapeDetailsPageResponse == 3) { throw 403; }

                                } catch (error) {
                                    if (error == 403) {
                                        this.log.logScraper("Page blocked, need to wait for 2 minutes...");
                                        await page.waitForTimeout(this.C.timeout);
    
                                        this.vehicleTimeouts.push(timeOutVehicle);
                                    }
                                    else {
                                        this.log.logScraper("Vin: " + vin + " Possible timeout " + detailUrl + " ERROR: " + error);
                                        this.log.logScraper("Vehicle " + vin + " added to the timeout list.");
                                    }
                                }
                            }

                            try {

                                let scrapeDetailsPageResponse = await this.scrapeDetailsPage(currentVehicle, page, feed);

                                if (scrapeDetailsPageResponse == 1) {}
                                else if (scrapeDetailsPageResponse == 2) {throw 404;}
                                else if (scrapeDetailsPageResponse == 3) {throw 403;}

                            } catch (error) {

                                if (error == 403) {
                                    this.log.logScraper("Page blocked, need to wait for 2 minutes...");
                                    await page.waitForTimeout(this.C.timeout);

                                    this.vehicleTimeouts.push(currentVehicle);
                                }
                                else {
                                    this.log.logScraper("Vin: " + vin + " Possible timeout " + detailUrl + " ERROR: " + error);
                                    this.log.logScraper("Vehicle " + vin + " added to the timeout list.");
                                }

                                return [];
                            }
                        });
                    }, {concurrency: this.C.maximum_tabs});
                }, browser);
            }

            // Collect Scraped vins
            let collectedVehicles = await this.collectScrapedVins(feed);

            let jsonFileName = feed.getJsonVehicleFileNameByYear(year);

            this.log.logScraper(collectedVehicles.length + " vehicle(s) have been saved into: " + jsonFileName, false, "info");
            // Save data as json file
            await feed.saveJsonFile(collectedVehicles, jsonFileName);
            // Move vehicle json file to storage file
            this.log.logScraper("Moving " + jsonFileName + " into " + this.DBConfig.CARFAX_FEED_IMPORT_DESTINATION);
            await feed.moveFeedPerYearFile(jsonFileName, year);
                
            // Clean up scraped vins
            this.log.logScraper("Cleaning scraped vins...");
            feed.cleanUpScrapedVins(this.currentyear);

        }
        else {
            this.log.logScraper("No vehicles made it for year: " + year, false, "error");
       }
    }
}

module.exports = Carfax;