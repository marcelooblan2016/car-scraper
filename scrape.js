const logger = require("./logs/log");
const feedEnterprise = require("./enterprise/enterprise.js");
const feedAdesa = require("./adesa/adesa.js");
const feedCarfax = require("./carfax/carfax.js");
const feedEdge = require("./edge/edge.js");
const fd = require("./feed.js");
const fs = require('fs-extra');
const C = require('./constants');
const Helper = require('./helper.js');
const {dbConfigurations} = require('./configurations.js');

( async () => {
    const args = process.argv.slice(2)
    const feedName = args[0];
    const feedYear = typeof args[1] != 'undefined' ? args[1] : null;

    const log = new logger(fs);

    let feedClass = null;
    let feed = null;
    let years = [];
    let availableYears = {};
    let options = {
        feedName: null,
        fs: fs,
        C: C,
        log: log,
        helper: new Helper(),
        // Load Database Configurations
        DBConfig: await dbConfigurations(C.app_url),
    };

    let hasExposeApi = false;
    let type = 1;

    switch(feedName) {
        case "edge":
            // instantiate feed class
            options.feedName = feedName;

            feedClass = new feedEdge(options);

            feed = new fd(options);
            
            log.logScraper("Starts at: " + feed.getCurrentDateTime());

            // initiate directory
            log.logScraper("Initiate Directories...");
            feed.initiateDirectories();

            // clean vehicle json files
            await feed.clearJsonVehicleFiles();

            if (feedYear == null) {
                const todaysDate = new Date()
                const maxAge = options.DBConfig.EDGE_MAX_AGE;
                const currentYear = todaysDate.getFullYear();
                let maxYear = currentYear + 1;
            
                for (let year = (maxYear); year >= (maxYear - maxAge); year--) {
                    years.push(year);
                }
             }
             else {
                if (String(feedYear).includes('-')) {
                    let comboYear = feedYear.split('-');
                    let minYear = comboYear[0];
                    let maxYear = comboYear[1];
        
                    for(let year = minYear; year <= maxYear; year++) {
                        years.push(parseInt(year));
                    }
                }
                else {
                    years.push(parseInt(feedYear));
                }
             }

            
            hasExposeApi = false;
            break;
        case "carfax":
            // instantiate feed class
            options.feedName = feedName;

            feedClass = new feedCarfax(options);

            feed = new fd(options);
            
            log.logScraper("Starts at: " + feed.getCurrentDateTime());

            // initiate directory
            log.logScraper("Initiate Directories...");
            feed.initiateDirectories();

            // clean vehicle json files
            await feed.clearJsonVehicleFiles();
           
            if (feedYear == null) {
               const todaysDate = new Date()
               const maxAge = options.DBConfig.CARFAX_MAX_AGE;
               const currentYear = todaysDate.getFullYear();
               let maxYear = currentYear + 1;
           
               for (let year = (maxYear); year >= (maxYear - maxAge); year--) {
                   years.push(year);
               }
            }
            else {
               if (String(feedYear).includes('-')) {
                   let comboYear = feedYear.split('-');
                   let minYear = comboYear[0];
                   let maxYear = comboYear[1];
       
                   for(let year = minYear; year <= maxYear; year++) {
                       years.push(parseInt(year));
                   }
               }
               else {
                   years.push(parseInt(feedYear));
               }
            }
           
            hasExposeApi = false;
            type = 2;
            break;
        case "enterprise":
            // instantiate feed class
            options.feedName = feedName;

            feedClass = new feedEnterprise(options);

            feed = new fd(options);

            log.logScraper("Starts at: " + feed.getCurrentDateTime());

            // initiate directory
            log.logScraper("Initiate Directories...");
            feed.initiateDirectories();

            // clean vehicle json files
            await feed.clearJsonVehicleFiles();
            
            hasExposeApi = true;
            // Build Vehicles from expose api of enterprise
            log.logScraper("Fetching vehicles via enterprise expose api");
            let fetchedVehicles = await feedClass.buildIndex(feedYear);

            // group vehicles by year
            log.logScraper("Grouping vehicles by year...");
            let groupedVehiclesByYear = feedClass.groupVehiclesByYear(fetchedVehicles);
            for(let key in groupedVehiclesByYear) {
                let currentVehiclesByYear = groupedVehiclesByYear[key];
                log.logScraper(key + " vehicles found: " + currentVehiclesByYear.length);

                if (currentVehiclesByYear.length >= 1) {
                    
                    years.push(key);
                    availableYears[key] = currentVehiclesByYear;
                }
            }

            break;
        case "adesa":
            // instantiate feed class
            options.feedName = feedName;

            feedClass = new feedAdesa(options);

            feed = new fd(options);

            log.logScraper("Starts at: " + feed.getCurrentDateTime());

            // initiate directory
            log.logScraper("Initiate Directories...");
            feed.initiateDirectories();
            
            // clean vehicle json files
            await feed.clearJsonVehicleFiles();

            if (feedYear == null) {
                const todaysDate = new Date()
                const maxAge = options.DBConfig.ADESA_SCRAPER_MAX_AGE;
                const currentYear = todaysDate.getFullYear();
                let maxYear = currentYear + 1;
            
                for (let year = (maxYear); year >= (maxYear - maxAge); year--) {
                    years.push(year);
                }
            }
            else {
                if (String(feedYear).includes('-')) {
                    let comboYear = feedYear.split('-');
                    let minYear = comboYear[0];
                    let maxYear = comboYear[1];
        
                    for(let year = minYear; year <= maxYear; year++) {
                        years.push(parseInt(year));
                    }
                }
                else {
                    years.push(parseInt(feedYear));
                }
            }
            
            hasExposeApi = false;
            type = 1;
            break;
        default:
            log.logScraper("No feed found.", false, "error");
            process.exit(0);
            break;
    }
   
    const {browser} = await feed.startBrowser();

    // No expose Api -- Build vehiicle index by crawling...
    let context = null;
    if (hasExposeApi == false) {
        let yearCount = 1;

        for(let indexYear in years) {
            let currentYear = years[indexYear];
            let fetchedVehiclesByYear  = [];

            fetchedVehiclesByYear = await feedClass.buildIndex(currentYear, yearCount == 1 ? true : false, browser);

            log.logScraper(currentYear + " vehicles found: " + fetchedVehiclesByYear.length, false, "info");
    
            if (fetchedVehiclesByYear.length >= 1) {
                availableYears[currentYear] = fetchedVehiclesByYear;
            }
    
            yearCount++;
        }
    }

    log.logScraper(feedName + " scraping additional details for year: [" + years.join(",") + "]...", true);

    let count = 1;

    for (let year in availableYears) {
        let currentAvailableVehicles = availableYears[year];
        log.logScraper(feedName + " scraper starting for year: " + year);
        await feedClass.start(year, count == 1 ? true : false, currentAvailableVehicles, feed, browser)

        count++;
    }

    await feed.closeBrowser(browser);
    
    log.logScraper("Done!");
    log.logScraper("Ends at: " + feed.getCurrentDateTime());
    
    process.exit(0);
    
})();