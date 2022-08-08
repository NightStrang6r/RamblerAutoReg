import c from 'chalk';
import fs from 'fs';
import log from './log.js';
import Ask from './ask.js';
import Chrome from './chrome.js';
import Registration from './registration.js';

class App {
    constructor() {
        this.ask = new Ask();
        this.chrome = new Chrome();
    }

    async run() {
        this.chromePath = await this.chrome.getPath();

        if(fs.existsSync(this.chromePath)) {
            log(c.green(`Found Chrome: "${this.chromePath}"`));
        } else {
            log(c.red(`Chrome not found (path: "${this.chromePath}"). Exiting...`));
            return;
        }
        
        this.reg = new Registration(this.chromePath);
        let regMode = await this.ask.askRegMode();

        if(regMode == 'Load data from file') {
            await this.reg.byFile();
        } else {
            await this.reg.byGenerate();
        }
    }
}

export default App;