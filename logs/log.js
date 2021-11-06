const chalk = require('chalk');

class Log {
    constructor(fs) {
        this.fs = fs;
    }

    logScraper(content, fresh = false, type = 'default', fileName = 'scraper.log') {
        if (fresh == true && this.fs.existsSync(fileName)) {
            try {
                this.fs.unlinkSync(fileName);
            } catch (error) {}
        }
        /*
         * Disabled 
        fs.appendFileSync(fileName, content + "\n", cb);
        */
       switch(type) {
           case 'error':
                console.log(chalk.red(content));
           break;
           case 'info':
                console.log(chalk.blue(content));
           break;
           case 'default':
           default:
                console.log(chalk.green(content))
           break;
       }

    } 
}



module.exports = Log;