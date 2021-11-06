const axios = require('axios');
const bluebird = require("bluebird");
const { type } = require('jquery');
const { xor } = require('lodash');
const _ = require('lodash');

class Edge {

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
        try {
            let vehiclesRaw = [];
            let divVehicle = $(C.edge.selectors.search_results.div_vehicle);
            divVehicle.each( function () {
                let vehicleTitle = null;
                let vehicleUrl = null;
                let vehicleVin = null;
                let vehiclePrice = {};

                vehicleAnchorTag = $(this).find(".inner-vehicle .details-header .description a");
                try {
                    vehicleTitle = vehicleAnchorTag.text();
                } catch (subError) {}

                try {
                    vehicleUrl = vehicleAnchorTag.attr('href');
                } catch (subError) {}

                try {
                    let vehicleVinRaw = $(this).find(".inner-vehicle .details-header .vin-barcode img").attr("alt");
                    // VIN Barcode 2HNYD2H66BH524175
                    vehicleVin = vehicleVinRaw.replace('VIN Barcode', '').trim();

                } catch (subError) {}

                // MMR Price
                try {
                    let detailsRaw = $(this).find(".inner-vehicle .details").text().trim().replace(/\n/g, "");

                    let matchesMMR = detailsRaw.match(/\sMMR:(.*)\s/);
                    
                    matchesMMR = (matchesMMR[0]).trim().split(" ").filter( function (str) {
         
                        return str != "";
                    });
         
                    let mmrPrice = (matchesMMR[0]).replace('MMR:', '').replace(',' ,'').replace('$', '');
                    
                    vehiclePrice['mmr'] = parseInt(mmrPrice);

                } catch (subError) {}

                // Buy Now Price
                try {
                    let detailsRaw = $(this).find(".inner-vehicle .details").text().trim().replace(/\n/g, "");

                    let matchesBuyNowPrice = detailsRaw.match(/Buy Now Price:(.*)\s/);
                    matchesBuyNowPrice = matchesBuyNowPrice.map( function (str) {

                        return str.replaceAll(/   /g, '');
                    });

                    matchesBuyNow = (matchesBuyNowPrice[0]).split(" ").filter( function (str) {
                        let pr = new RegExp(/\$/);
            
                        return pr.test(str);
                    });

                    let buyNowPrice = (matchesBuyNow[0]).replace('Buy', '').replace(',' ,'').replace('$', '');

                    vehiclePrice['buy'] = parseInt(buyNowPrice);

                } catch (subError) {}

                // Pricing - Selection
                vehiclePrice['main'] = (function (price) {
                    // Prioritize buy price
                    if (typeof price['buy'] != 'undefined' && price['buy'] != null) {
                        return price['buy'];
                    }
                    
                    /*
                     * Disabled - MMR not allowed
                     *
                    if (typeof price['mmr'] != 'undefined' && price['mmr'] != null) {
                        return price['mmr'];
                    }
                     *
                     */

                    return null;
                })(vehiclePrice);

                let vehicleRaw = {
                    title: vehicleTitle,
                    url: vehicleUrl,
                    vin: vehicleVin,
                    price: vehiclePrice,
                };

                vehiclesRaw.push(vehicleRaw);
            });
            
            // filter empty price - assurance
            vehiclesRaw = vehiclesRaw.filter( function (vehicle) {

                return typeof vehicle['price']['main'] != 'undefined' && vehicle['price']['main'] != null;
            });

            return vehiclesRaw;
        } catch (error) {
            return [];
        }
    }

    scrapeInitialPageInfo(C) {
        
    }

    scrapeTotalPages(C) {
        let $ = jQuery;
        try {
            // Showing 1-50 of 21,377
            let paginationStatRaw = $(C.edge.selectors.search_results.p_pagination_stats).first().text();

            let splittedPagination = paginationStatRaw.split('of');
            let total = (splittedPagination[1]).replace(',', '');
            let pagination = (splittedPagination[0]).split('-')[1];
            total = parseInt((total).trim());
            pagination = parseInt((pagination).trim());

            let totalPages = total % pagination == 0 ? parseInt(total / pagination) : parseInt((total / pagination ) + 1);
            
            return {
                'pagination': pagination,
                'total': total,
                'total_pages': totalPages,
            };

        } catch (error) {
            return {
                'pagination': 0,
                'total': 0,
                'total_pages': 0,
            };
        }
    }

    isLoginPage(C) {

    }

    async login(page) {
        try {
            let loginUrl = this.DBConfig.EDGE_LOGIN_URL;
            this.log.logScraper("Surfing Login: " + loginUrl);
    
            await page.goto(loginUrl, {waitUntil: 'load', timeout: this.C.timeout});
    
            await page.waitForSelector(this.C.edge.selectors.login.div_login_box, {timeout: this.C.timeout, visible: true});
    
            this.log.logScraper("Inputting username/password...");
            await page.click(this.C.edge.selectors.login.input_username);
            await page.keyboard.type(this.DBConfig.EDGE_ACCOUNT_USERNAME);
            await page.click(this.C.edge.selectors.login.input_password);
            await page.keyboard.type(this.DBConfig.EDGE_ACCOUNT_PASSWORD);
            this.log.logScraper("Logging In...");
            await page.click(this.C.edge.selectors.login.button_signin);
            // await page.waitForNavigation();
    
            await page.waitForSelector(this.C.edge.selectors.class_logged_in);
            this.log.logScraper("Logged In successfully");

            return 1;
        } catch (error) {
            this.log.logScraper("Unable to login: Error-> " + error);

            return 0;
        }
    }
    /**
     *  Build Vehicles from expose api of enterprise
     */
    async buildIndex(currentYear, firstLogin = false, context) {
        currentYear = (currentYear).toString();

        let page = await context.newPage();

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

        let width = this.C.resolution.width;
        let height = this.C.resolution.height;

        await page.setViewport({
            width: width,
            height: height,
        });
        
        // login
        if (firstLogin == true) {
            let isLogin = await this.login(page);
            if (isLogin == 0) {
                this.log.logScraper("Scraper exiting...");
    
                return [];
            }    
        }

        this.log.logScraper("Wait for 5 seconds...");
        await page.waitForTimeout(5000);

        // build parameters
        let indexUrl = this.DBConfig.EDGE_INDEX_URL;
        this.log.logScraper("Surfing " + indexUrl);
        await page.goto(indexUrl, {waitUntil: 'load', timeout: this.C.timeout});
        await page.waitForSelector(this.C.edge.selectors.search_build.div_search);

        this.log.logScraper("Wait for 3 seconds...");
        await page.waitForTimeout(3000);

        this.log.logScraper("Filling up parameters...");
        let maxAge = this.DBConfig.EDGE_MAX_AGE;

        let minimumYear = (function (maxAge) {
            const todaysDate = new Date()
            const currentYear = todaysDate.getFullYear();
            let maxYear = currentYear + 1;
    
            return maxYear - maxAge;
        })(maxAge);

        await page.select(this.C.edge.selectors.search_build.select_year_minimum, (currentYear).toString());
        await page.select(this.C.edge.selectors.search_build.select_year_maximum, (currentYear).toString());
        this.log.logScraper("Year filled: " + currentYear);

        let minimumGrade = this.C.edge.options.grade.minimum;
        let maximumGrade = this.C.edge.options.grade.maximum;
        await page.select(this.C.edge.selectors.search_build.select_grade_minimum, (minimumGrade).toString());
        await page.select(this.C.edge.selectors.search_build.select_grade_maximum, (maximumGrade).toString());
        this.log.logScraper("Grade Min: " + minimumGrade + " - Min: " + maximumGrade);
        
        let minimumMileAge = this.C.edge.options.mileage.minimum;
        let maximumMileAge = this.C.edge.options.mileage.maximum;
        await page.select(this.C.edge.selectors.search_build.select_odometer_minimum, (minimumMileAge).toString());
        await page.select(this.C.edge.selectors.search_build.select_odometer_maximum, (maximumMileAge).toString());
        this.log.logScraper("Mileage/Odometer Min: " + minimumMileAge + " - Min: " + maximumMileAge);
        
        let minimumPrice = this.C.scrape_price_limit;
        await page.click(this.C.edge.selectors.search_build.input_mmr_minimum);
        await page.keyboard.type((minimumPrice).toString());

        this.log.logScraper("MMR Min: " + minimumPrice);

        let checkboxFuelTypeList = await page.$$(this.C.edge.selectors.search_build.checkbox_fuel_types);
        for (let checkboxFuelType of checkboxFuelTypeList) {
            await checkboxFuelType.click();
        }
        this.log.logScraper("Fuel Types: checked");

        let types = this.C.edge.options.types;
        for (let optionType in types) {

            if (types[optionType]['checked'] == true) {
                await page.$eval('.types input[value="' + types[optionType]['value'] + '"]', check => check.checked = true);
            }
            else {
                await page.$eval('.types input[value="' + types[optionType]['value'] + '"]', check => check.checked = false);
            }
        }
        this.log.logScraper("Types: checked");

        this.log.logScraper("Wait for 3 seconds...");
        await page.waitForTimeout(3000);

        await page.click(this.C.edge.selectors.search_build.button_search);
        await page.waitForNavigation();
        // scrape car summary vehicles;
        await page.waitForSelector(this.C.edge.selectors.search_results.div_search_results, {timeout: this.C.timeout, visible: true});

        // calculate total pages

        // page.on('console', consoleObj => console.log(consoleObj.text()));

        let paginationStat = await page.evaluate(this.scrapeTotalPages, this.C);
        console.log(paginationStat);

        let totalPages = paginationStat.total_pages;
        let vehicles = [];
        

        for(let indexPage = 1; indexPage <= totalPages; indexPage++) {
            let rawVehicles = [];

            if (indexPage == 1) {
                rawVehicles = await page.evaluate(this.scrapeIndexPage, this.C);
            }
            else {
                // https://www.edgepipeline.com/components/search/new/results?page=2
                let detailUrl = [
                    this.DBConfig.EDGE_HOME_URL,
                    '/components/search/new/results?page=',
                    indexPage
                ].join("");

                this.log.logScraper("Surfing " + detailUrl);
                await page.goto(detailUrl, {waitUntil: 'load', timeout: this.C.timeout});
                await page.waitForTimeout(3000);
                await page.waitForSelector(this.C.edge.selectors.search_results.div_search_results, {timeout: this.C.timeout, visible: true});

                rawVehicles = await page.evaluate(this.scrapeIndexPage, this.C);
            }

            vehicles = [
                ...rawVehicles,
                ...vehicles,
            ];

            this.log.logScraper("Wait for 5 seconds...");
            await page.waitForTimeout(5000);
        }

        await page.close();

        this.log.logScraper("Vehicles Index built. Total: " + vehicles.length);

        return vehicles;
    }

    async getAvailableVehicles(year) {
        try {
            let apiUrl = [
                this.C.app_url,
                "/api/search/vehicles/available",
                "?feed-id=10",
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

    scrapeDetailsImageCount(C) {
        let $ = jQuery;
        try {
            let slideCount = $(C.edge.selectors.search_details.span_slide_count).first().text();
            // 22 of 24
            let splitArr = slideCount.split('of');

            return parseInt((splitArr[1]).toString().trim());

        } catch (error) {

            return 0;
        }
    }

    scrapeDetailsImageActive(C) {
        let $ = jQuery;
        try {
            let imgActive = $(C.edge.selectors.search_details.img_active).first();
            if (imgActive.length >= 1) {
                return imgActive.attr("src");
            }

            return null;
        } catch (error) {
            return null;
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
        
        // contact
        let contactDetails = {}
        try {
            contactDetails['company'] = $(C.edge.selectors.search_details.h3_company).text();
        } catch (error) {}

        try {
            contactDetails['location'] = $(C.edge.selectors.search_details.h4_location).text();
        } catch (error) {}

        try {
            contactDetails['phone'] = $(C.edge.selectors.search_details.h5_phone).text();
        } catch (error) {}

        additionalDetails['contact'] = contactDetails;

        // odometer
        try {
            additionalDetails['odometer'] = $(C.edge.selectors.search_details.div_odometer).text();
        } catch (error) {}

        // grade
        try {
            additionalDetails['grade'] = $(C.edge.selectors.search_details.div_grade).text();
        } catch (error) {}

        // Field Values
        try {
            let fields = $(C.edge.selectors.search_details.div_field_section_details);
  
            fields.each( function () {
                try {
                    let rawText = ($(this).text()).toString().trim();
                
                    let vinRegex = new RegExp(/VIN(.*)/);
        
                    if (vinRegex.test(rawText)) {
                        additionalDetails['vin'] = rawText.replace('VIN', '').trim();
                    }
                    
                    // Color BLACK
                    let extColorRegex = new RegExp(/Color(.*)/);
                    if (extColorRegex.test(rawText)) {
                        additionalDetails['exterior_color'] = rawText.replace('Color', '').trim();
                    }
        
                    // Interior Color / Material BK / Cloth
                    let intColorRegex = new RegExp(/Interior Color(.*)/);
                    if (intColorRegex.test(rawText)) {
                        additionalDetails['interior_color'] = rawText.replace('Interior Color', '').replace('/', '').trim();
                    }
        
                    // Transmission Automatic
                    let transmissionRegex = new RegExp(/Transmission(.*)/);
                    if (transmissionRegex.test(rawText)) {
                        additionalDetails['transmission'] = rawText.replace('Transmission', '').trim();
                    }
        
                    // Drive Train FWD
                    let driveTrainRegex = new RegExp(/Drive Train(.*)/);
                    if (driveTrainRegex.test(rawText)) {
                        additionalDetails['drive_train'] = rawText.replace('Drive Train', '').trim();
                    }
        
                    // Body Style 4D Sdn
                    let bodyStyleRegex = new RegExp(/Body Style(.*)/);
                    if (bodyStyleRegex.test(rawText)) {
                        additionalDetails['body_style'] = rawText.replace('Body Style', '').trim();
                    }
        
                    // Displacement 2.0
                    let displacementRegex = new RegExp(/Displacement(.*)/);
                    if (displacementRegex.test(rawText)) {
                        additionalDetails['displacement'] = rawText.replace('Displacement', '').trim();
                    }
        
                    // Doors 4
                    let doorsRegex = new RegExp(/Doors(.*)/);
                    if (doorsRegex.test(rawText)) {
                        additionalDetails['doors'] = rawText.replace('Doors', '').trim();
                    }
        
                    // Fuel Type Gasoline
                    let fuelRegex = new RegExp(/Fuel Type(.*)/);
                    if (fuelRegex.test(rawText)) {
                        additionalDetails['fuel_type'] = rawText.replace('Fuel Type', '').trim();
                    }
        
                    // Cylinders 4
                    let CylinderRegex = new RegExp(/Cylinders(.*)/);
                    if (CylinderRegex.test(rawText)) {
                        additionalDetails['cylinder'] = rawText.replace('Cylinders', '').trim();
                    }
              } catch (subError) {}
            });

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
                let displayPrice = parseInt(currentVehicle['price']['main']);
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
            
                            let vinsFile = feed.getFileNameVinsFile(vin, this.currentyear);
            
                            let detailUrl = [
                                this.DBConfig.EDGE_HOME_URL,
                                currentVehicle['url'],
                            ].join("");
            
                            try {
                                this.log.logScraper(vin + " Surfing & Scraping additional details: " + detailUrl);
                                
                                const response = await page.goto(detailUrl, {waitUntil: 'load', timeout: this.C.timeout});
                                await page.waitForSelector(this.C.edge.selectors.search_details.h1_description, {timeout: this.C.timeout});

                                // Additional Details
                                let vehicleAdditionalDetails = await page.evaluate(this.scrapeAdditionalDetails, this.C);
                                currentVehicle['additional_details'] = vehicleAdditionalDetails;

                                await page.waitForSelector(this.C.edge.selectors.search_details.span_slide_count, {timeout: this.C.timeout});

                                let imageCount = await page.evaluate(this.scrapeDetailsImageCount, this.C);
                                // this.log.logScraper("Image Count: " + imageCount);

                                let vehicleImages = [];

                                if (imageCount >= 1) {
                                    for (let imageIndex = 1; imageIndex <= imageCount; imageIndex++) {
                                        let imgUrl = null;
                                        if (imageIndex == 1) {
                                            imgUrl = await page.evaluate(this.scrapeDetailsImageActive, this.C);
                                        }
                                        else {
                                            await page.click(this.C.edge.selectors.search_details.button_img_next);
                                            await page.waitForTimeout(1000);
                                            imgUrl = await page.evaluate(this.scrapeDetailsImageActive, this.C);
                                        }

                                        if (imgUrl != null) {
                                            vehicleImages.push(imgUrl);
                                        }
                                    }
                                }

                                currentVehicle['images'] = vehicleImages;

                                // Save data as json file
                                await feed.saveJsonToVinsFile(currentVehicle, vinsFile);

                                // update count index
                                this.scrapedVehicles++;

                                this.log.logScraper(this.scrapedVehicles + "/" + this.totalVehicles + " : " + vin + " " + detailUrl + " Scraped!");

                            } catch (error) {

                                this.log.logScraper("Vin: " + vin + " Possible timeout " + detailUrl + " ERROR: " + error);
                                
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
            this.log.logScraper("Moving " + jsonFileName + " into " + this.DBConfig.EDGE_FEED_IMPORT_DESTINATION);
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

module.exports = Edge;