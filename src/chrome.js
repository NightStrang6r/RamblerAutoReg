import puppeteer from 'puppeteer';
import getChrome from 'get-chrome';

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
        return getChrome();
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