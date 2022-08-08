import puppeteer from 'puppeteer';
import { execFile } from 'child_process';
import path from 'path';

class Chrome {
    constructor(chromePath = '') {
        this.browser = null;
        this.chromePath = chromePath;
    }

    async launch() {
        this.browser = await puppeteer.launch({
            executablePath: this.chromePath,
            headless: false,
            args:[
                '--start-maximized'
            ],
            defaultViewport: null
        });
    }

    async close() {
        this.browser.close();
    }

    getBrowser() {
        return this.browser;
    }

    async getPath() {
        const promise = new Promise((resolve, reject) => {
            const __dirname = path.resolve(path.dirname(''));
            const pathToBat = path.resolve(__dirname, 'src/utils/chromePath.bat');

            execFile(pathToBat, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    resolve(false);
                }
                if (stderr!= "")
                    resolve(false);;

                let result = stdout.split('"');

                for(let i = 0; i < result.length; i++) {
                    if(result[i].includes('chrome.exe')) {
                        result = result[i];
                        break;
                    }
                }

                resolve(result);
            });
        });
        
        return promise;
    }

    setPath(path) {
        this.chromePath = path;
    }

    async deleteCookies(page) {
        const client = await page.target().createCDPSession();	
        await client.send('Network.clearBrowserCookies');
    }
}

export default Chrome;