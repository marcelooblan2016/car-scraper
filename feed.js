const puppeteer = require('puppeteer');
const cb = (err) => { if(err) console.error(err); }
const { exec } = require("child_process");

class Feed {

    constructor(options) {
        this.fs = options.fs;
        this.feedName = options.feedName;
        this.C = options.C;
        this.DBConfig = options.DBConfig;
        this.log = options.log;

        const { readFile } = this.fs.promises;
        this.readFile = readFile;

        switch(this.feedName) {
            case "adesa":
                this.maxAge = this.DBConfig.ADESA_SCRAPER_MAX_AGE;
                break;
            case "enterprise":
                this.maxAge = this.DBConfig.ENTERPRISE_SCRAPER_MAX_AGE;
                break;
            case "carfax":
                this.maxAge = this.DBConfig.CARFAX_MAX_AGE;
                break;
            case "edge":
                this.maxAge = this.DBConfig.EDGE_MAX_AGE;
                break;
            default:
                this.maxAge = 8;
            break;
        }
    }

    getCurrentDateTime() {
        let currentdate = new Date(); 
        let datetime =  currentdate.getDate() + "/"
                        + (currentdate.getMonth()+1)  + "/" 
                        + currentdate.getFullYear() + " @ "  
                        + currentdate.getHours() + ":"  
                        + currentdate.getMinutes() + ":" 
                        + currentdate.getSeconds();
        return datetime;
    }

    /* VERSION 2 BEGIN */
    async withBrowser(fn, existingBrowser = null) {
        let browser = null;
        if (existingBrowser != null) {
            browser = existingBrowser;
        }
        else {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox'],
                userDataDir: this.profile_dir
            });
        }
    
        try {
            return await fn(browser);
        } finally {}
    }

    withPage(browser) {
        let C = this.C;
        let width = C.resolution.width;
        let height = C.resolution.height;
        let userAgent = C.user_agent;

        return async function (fn) {
            let page = await browser.newPage();
            page.setViewport({width: width, height: height});
            // setting user agent
            await page.setUserAgent(userAgent);

            try {
                return await fn(page);
            } finally {
                await page.close();
            }
        };
    }
    
    /* VERSION 2 END */

    async startBrowser() {
        let isHeadLess = this.C.app_env == 'local' ? false : true;
        isHeadLess = true;
        
        let args = [];
        args.push('--no-sandbox');

        let width = this.C.resolution.width;
        let height = this.C.resolution.height;
            
        args.push('--window-size=' + width + ',' + height +'');
        args.push('--start-maximized');

        const chromeArgs = [
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
        ];

        args = [
            ...args,
            ...chromeArgs
        ];

        // args.push('--incognito');
        
        const browser = await puppeteer.launch({
            headless: isHeadLess,
            args: args,
            userDataDir: this.profile_dir
        });
         
        const page = await browser.newPage();
        return {browser, page};
    }
    
    async closeBrowser(browser) {
        // Close Open pages...
        for (let page of await browser.pages()) {
            await page.close({
              "runBeforeUnload": true
            });
        }

        this.log.logScraper("Pages closed.");

        browser.on('disconnected', () => {
            const pid = browser.process().pid;
            
            console.log(`Browser Disconnected... Process Id: ${pid}`);
            exec(`kill -9 ${pid}`, (error, stdout, stderr) => {
                if (error) {
                    console.log(`Process Kill Error: ${error}`)
                }
                console.log(`Process Kill Success. stdout: ${stdout} stderr:${stderr}`);
            });
        });

        browser.disconnect();
        this.log.logScraper("Browser closed.");

        this.log.logScraper("Deleting tmp files...");
        // Deletes all files(recursively) in tmp profile
        this.fs.removeSync(this.profile_dir); 
    }

    initiateDirectories() {

        this.file_prefix = [this.feedName, '-', 'feed'].join("");
        this.vins_dir = [this.feedName, "/", "vins"].join("");
        this.profile_dir = [this.feedName, "/", "profile"].join("");

        let requiredDirectories = [
            this.feedName,
            this.vins_dir,
            this.profile_dir,
        ];

        /* Vins By Year */
        const todaysDate = new Date()
        const maxAge = this.maxAge;
        const currentYear = todaysDate.getFullYear();
        let maxYear = currentYear + 1;

        for (let year = (maxYear); year >= (maxYear - maxAge); year--) {
            let vinYearDir = [
                this.vins_dir,
                "/",
                year
            ].join("");

            requiredDirectories.push(vinYearDir);
        }

        let currentDirectory = null;
        for(let index in requiredDirectories) {
            currentDirectory = requiredDirectories[index];
            if (!this.fs.existsSync(currentDirectory)) this.fs.mkdirSync(currentDirectory);
        }

    }

    async readJsonFile(jsonFileName) {

        let data = await this.readFile(jsonFileName, 'utf8');
        try {
            let parsedJsonData = JSON.parse(data);
            return parsedJsonData;
        } catch (error) {
            return [];
        }
    }

    getVinFiles(year = null) {

        let pathFiles = [];
        let fsVinsDirectory = this.vins_dir;

        if (year != null) {
            fsVinsDirectory = [fsVinsDirectory, "/", year].join("");
        }

        this.fs.readdirSync(fsVinsDirectory).forEach(file => {
            let jsonPath = [
                fsVinsDirectory,
                "/",
                file
            ].join("");
           
            pathFiles.push(jsonPath);
        });

        return pathFiles;
    }
    
    getJsonVehicleFileNameByYear(year) {

        return [
            this.feedName,
            "/",
            this.getVehicleFileName(year)
        ].join("");
    }
    
    getVehicleFileName(year) {

        return [
            'vehicles-',
            year,
            '.json'
        ].join("");
    }

    getFileNameVinsFile(vin, year = null) {
        if (year != null) {
            return [
                this.vins_dir,
                '/',
                year,
                '/',
                vin + ".json",
            ].join("");
        }
        else {
            return [
                this.vins_dir,
                '/',
                vin + ".json",
            ].join("");
        }
    }

    isFileNameVinsFileExist(vin, year = null) {
        let vinsFileName = this.getFileNameVinsFile(vin, year);

        if (this.fs.existsSync(vinsFileName)) {
            return true;
        }
        
        return false;
    }

    async saveJsonToVinsFile(data, jsonFile) {
        if (this.fs.existsSync(jsonFile)) {

            try {
                this.fs.unlinkSync(jsonFile);
            } catch (error) {}
        }

        this.fs.appendFileSync(jsonFile, JSON.stringify(data));
    }

    async clearJsonVehicleFiles() {

        const todaysDate = new Date()
        const maxAge = this.C[this.feedName].max_age;
        const currentYear = todaysDate.getFullYear();
        let maxYear = currentYear + 1;
    
        for (let year = (maxYear); year >= (maxYear - maxAge); year--) {
            let jsonFileName = [
                this.feedName,
                "/",
                this.getVehicleFileName(year)
            ].join("");

            if (this.fs.existsSync(jsonFileName)) {
                try {
                    this.fs.unlinkSync(jsonFileName);
                } catch (error) {}
            }

        }
    }

    /**
     * Save object: vehicles into json file
     * @param {*} data 
     * @param {*} jsonFile 
     */
     async saveJsonFile(data, jsonFile) {
        // remove existing file to prevent json conflict
        if (this.fs.existsSync(jsonFile)) {

            try {
                this.fs.unlinkSync(jsonFile);
            } catch (error) {}
        }

        this.fs.appendFileSync(jsonFile, "[", cb);

        for(let x in data) {
            let iContent = JSON.stringify(data[x]);
            let content = x == 0 ? iContent : [",", iContent].join('');
            this.fs.appendFileSync(jsonFile, content, cb);
        }

        this.fs.appendFileSync(jsonFile, "]", cb);
    }

    getFileNameFeedFile(year) {

        return [
            this.file_prefix,
            '-',
            year,
            '.json'
        ].join("");
    }

    async moveFeedPerYearFile (jsonVehicleFile, year) {
        let fsFilenameDestinationPath = null;
        switch(this.feedName) {
            case 'adesa':
                fsFilenameDestinationPath = this.DBConfig.ADESA_FEED_IMPORT_DESTINATION;
                break;
            case 'enterprise':
                fsFilenameDestinationPath = this.DBConfig.ENTERPRISE_FEED_IMPORT_DESTINATION;
                break;
            case 'carfax':
                fsFilenameDestinationPath = this.DBConfig.CARFAX_FEED_IMPORT_DESTINATION;
                break;
            case 'edge':
                    fsFilenameDestinationPath = this.DBConfig.EDGE_FEED_IMPORT_DESTINATION;
                break;
        }
        
        let targetFile = this.getFileNameFeedFile(year);
        if (!this.fs.existsSync(jsonVehicleFile)) {
            this.log.logScraper(jsonVehicleFile + " does not exists.");
            return false;
        }

        let destinationPathFull = [
            fsFilenameDestinationPath,
            targetFile
        ].join("");

        try {
            
            this.fs.copyFile(jsonVehicleFile, destinationPathFull, (err) => {
                if (err) {
                    this.log.logScraper("Error Found:", err);
                }
            });
            // remove file
            this.fs.unlink(jsonVehicleFile);

            /*
             * Disabled not working in storage shortcut ex: prod, staging
            this.fs.rename(jsonVehicleFile, destinationPathFull, function (err) {
                if (err) {
                    throw err
                } else {}
            });
            */

            return true;
        } catch (error) {
            return false;
        }
    }

    async cleanUpScrapedVins(year = null) {
        let pathFiles = this.getVinFiles(year);
        for(let index in pathFiles) {
            let jsonFileName = pathFiles[index];

            if (this.fs.existsSync(jsonFileName)) {
                try {
                    this.fs.unlinkSync(jsonFileName);
                } catch (error) {}
            }
        }

    }
}

module.exports = Feed;