import puppeteer from 'puppeteer';
import read from 'readline-sync';
import { load } from './storage.js';
import { execFile } from 'child_process';
import path from 'path';
import c from 'chalk';
import fs from 'fs';
import log from './log.js'
import Password from './password.js';
import Ask from './ask.js';

class App {
    constructor() {
        this.settings = load('settings.json');
        this.links = load('./src/links.json');
        this.browser = null;

        this.ask = new Ask();

        this.selectors = {
            mail: "#login",
            domainButton: ".rui-Select-arrow",
            domainMenu: ".rui-Menu-content",
            pass: "#newPassword",
            passVerify: "#confirmPassword",
            questionType: "input[placeholder='Выберите вопрос']",
            questionSelect: "div[data-cerber-id*='Почтовый индекс ваших родителей']",
            questionAnswer: "#answer",
            hCapcha: "#checkbox",
            submit: "button[type=submit]"
        };
    }

    async run() {
        this.chromePath = await this.getChromePath();

        if(fs.existsSync(this.chromePath)) {
            log(c.green(`Found Chrome: "${this.chromePath}"`));
        } else {
            log(c.red(`Chrome not found (path: "${this.chromePath}"). Exiting...`));
            return;
        }
        
        let regMode = await this.ask.askRegMode();

        if(regMode == 'Load data from file') {
            await this.regByFile();
        } else {
            await this.regByGenerate();
        }
    }

    async regByFile() {
        if(!fs.existsSync(this.settings.mailsFile)) {
            fs.writeFileSync(this.settings.mailsFile, 'mail@rambler.ua:password:recoveryCode');
            log(`${c.cyan(`File ${this.settings.mailsFile} created. Fill it with mail data in the format:`)} ${c.green('mail@rambler.ua:password:recoveryCode')} ${c.cyan('Each mail on a new line. Then restart the program.')}`);
            return;
        }

        log(c.green(`File ${this.settings.mailsFile} found`));

        const mails = this.parseMailsFile();
        if(!mails || ! mails.length) return;
        log(`Loaded ${mails.length} mails`);

        const toStart = await this.ask.askToStartRegistration();
        if(!toStart) return;

        await this.launchChrome();

        for(let i = 0; i < mails.length; i++) {
            const mail = mails[i];

            log(c.cyan(`[${(i + 1)}] Registering ${mail.login}...`));
            const res = await this.reg(mail.login, mail.domain, mail.pass, mail.code);
        
            if(res) {
                log(c.green(`[${(i + 1)}] Mail ${mail.email} successfully registered:`));
                log(mail.email);
                log(mail.pass);
                this.moveMailToRegisteredFile(mail.email);
            } else {
                log(c.red(`Failed to register mail ${mail.email}`));
                const toContinue = await this.ask.askToContinue();

                if(!toContinue) break;
            }
        }
        
        await this.closeChrome();
    }

    parseMailsFile() {
        const mailsFile = fs.readFileSync(this.settings.mailsFile);
        let mailsData = mailsFile.toString().split('\r\n');
        let mails = [];

        for(let i = 0; i < mailsData.length; i++) {
            if(!mailsData[i] || mailsData[i] == '') continue;

            let mail = mailsData[i].split(':');
            const email = mail[0];
            const pass = mail[1];
            const code = mail[2];
            const login = mail[0].split('@')[0];
            const domain = mail[0].split('@')[1];
            let error = false;

            if(!email || email == '') {
                log(c.red(`Failed to parse mail: mail cant be empty.`));
                error = true;
            }

            if(!email.includes('@')) {
                log(c.red(`Failed to parse mail: mail must contain "@" symbol.`));
                error = true;
            }

            if(login.length < 3 || login.length > 32) {
                log(c.red(`Failed to parse mail: login must be at least 3 characters and not more than 32 characters.`));
                error = true;
            }

            if(domain != 'rambler.ru' && domain != 'lenta.ru' && domain != 'autorambler.ru' && domain != 'myrambler.ru' && domain != 'ro.ru' && domain != 'rambler.ua') {
                log(c.red(`Failed to parse mail: domain ${domain} is not supported. Use rambler.ru, lenta.ru, autorambler.ru, myrambler.ru, ro.ru or rambler.ua instead.`));
                error = true;
            }

            if(pass.length < 9) {
                log(c.red(`Failed to parse mail: pass must contain at least 9 characters.`));
                error = true;
            }

            if(!code || code == '' || isNaN(code)) {
                log(c.red(`Failed to parse mail: code must be a number.`));
                error = true;
            }

            mail = {
                login: login,
                domain: domain,
                email: email,
                pass: pass,
                code: code
            }

            if(error) {
                log(mail);
                return;
            }

            mails.push(mail);
            log(`Parsing ${email}... ${c.green('OK')}`);
        }

        return mails;
    }

    async moveMailToRegisteredFile(email) {
        if(!fs.existsSync(this.settings.mailsFile)) {
            log(c.red(`Cant find ${this.settings.mailsFile}`));
            return;
        }

        if(!fs.existsSync(this.settings.registeredMailsFile)) {
            fs.writeFileSync(this.settings.registeredMailsFile, '');
            log(c.green(`File ${this.settings.registeredMailsFile} created`));
        }

        const mailsFile = fs.readFileSync(this.settings.mailsFile);
        let mailsData = mailsFile.toString().split('\r\n');
        const registeredMailsFile = fs.readFileSync(this.settings.registeredMailsFile);
        

        let mailString = '';

        for(let i = 0; i < mailsData.length; i++) {
            if(mailsData[i].includes(email)) {
                mailString = mailsData[i];
                mailsData.splice(i, 1);
                break;
            }
        }

        const newRegisteredMailsFile = registeredMailsFile.toString() + mailString + '\r\n';
        fs.writeFileSync(this.settings.registeredMailsFile, newRegisteredMailsFile);

        mailsData = mailsData.join('\r\n');
        fs.writeFileSync(this.settings.mailsFile, mailsData);
    }

    async regByGenerate() {
        let answers = await this.ask.ask();
        let login = answers.mailLogin;
        let domain = answers.domain;
        let passLength = +answers.passLength;
        let emailsCount = +answers.emailsCount;
        let code = answers.code;
        let startValue = 1;

        if(emailsCount > 1) {
            startValue = +read.question(`Введите начальное значение в имени регистрации (стандартно 1, т.е. ${login}${startValue}@rambler.ru, ${login}${startValue}@rambler.ru...): `);
        }
    
        if(passLength == 0) {
            passLength = 15;
        }
    
        if(emailsCount == 0) {
            emailsCount = 1;
        }
    
        if(startValue == 0) {
            startValue = 1;
        }
    
        const mails = await this.generateAccounts(login, domain, passLength, emailsCount, startValue, code);
    
        await this.launchChrome();

        for(let i = 0; i < mails.length; i++) {
            const mail = mails[i];
            const res = await this.reg(mail.login, mail.domain, mail.pass, mail.code);
        
            if(res) {
                log(c.green(`[${(i + 1)}] Mail ${mail.email} successfully registered:`));
                log(mail.email);
                log(mail.pass);
            } else {
                log(c.red(`Failed to register mail ${mail.email}`));
                const toContinue = await this.ask.askToContinue();

                if(!toContinue) break;
            }
        }
        
        await this.closeChrome();
    }

    async launchChrome() {
        this.browser = await puppeteer.launch({
            executablePath: this.chromePath,
            headless: false,
            args:[
                '--start-maximized'
            ],
            defaultViewport: null
        });
    }

    async closeChrome() {
        this.browser.close();
    }

    generateAccounts(login, domain, passLength, emailsCount, startValue, code) {
        let accounts = [];
        let password = new Password();
    
        for(let i = startValue; i < emailsCount + startValue; i++) {
            let currentLogin = login;

            if(emailsCount != 1) {
                currentLogin = `${login}${i}`;
            }
    
            const email = `${currentLogin}@rambler.ru`;
            const pass = password.generate(passLength);
    
            accounts[accounts.length] = {
                login: currentLogin,
                domain: domain,
                email: email,
                pass: pass,
                code: code
            };
        }

        return accounts;
    }

    async reg(login, domain, pass, code) {
        let result = false;
    
        try {
            const pages = await this.browser.pages();
            const page = pages[0];
            await page.goto(this.links.url);
    
            await page.waitForSelector(this.selectors.mail);
            await page.type(this.selectors.mail, login, {delay: 20});

            await page.evaluate(() => {
                return new Promise((resolve, reject) => {
                    document.querySelector('.rui-Select-arrow').click();
                    resolve(true);
                });
            });

            await page.waitForSelector(this.selectors.domainMenu);
            await page.evaluate((domainId) => {
                return new Promise((resolve, reject) => {
                    document.querySelector('.rui-Menu-content').children[domainId].click();
                    resolve(true);
                });
            }, this.getDomainNumber(domain));
    
            await page.type(this.selectors.pass, pass, {delay: 20});
    
            await page.type(this.selectors.passVerify, pass, {delay: 20});
    
            await page.click(this.selectors.questionType);
    
            await page.waitForSelector(this.selectors.questionSelect);
            await this.sleep(100);
            await page.click(this.selectors.questionSelect);
    
            await page.type(this.selectors.questionAnswer, code, {delay: 20});
    
            await page.evaluate(() => {
                return new Promise((resolve, reject) => {
                    setInterval(() => {
                        const element = document.querySelector('iframe');
                        const capchaResp = element.dataset.hcaptchaResponse;
                        console.log(capchaResp);
                        if(!capchaResp || capchaResp == "") return;
                        resolve(capchaResp);
                    }, 200);
                });
            });
            
            await page.click(this.selectors.submit);
            
            while(!(await page.target()._targetInfo.url).includes(this.links.readyPage)) {
                await this.sleep(500);
            }
            await this.deleteCookies(page);
    
            result = {
                login: `${login}@${domain}`,
                pass: pass,
                code: code
            };
        } catch (err) {
            log(c.red(`Error while registering mail: ${err}`));
        }
    
        return result;
    }
    
    async deleteCookies(page) {
        const client = await page.target().createCDPSession();	
        await client.send('Network.clearBrowserCookies');
    }

    async sleep(timeout) {
        return new Promise((resolve) => {
            setTimeout(resolve, timeout);
        });
    }

    async getChromePath() {
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

    getDomainNumber(domain) {
        switch(domain) {
            case 'rambler.ru': return 0;
            case 'lenta.ru': return 1;
            case 'autorambler.ru': return 2;
            case 'myrambler.ru': return 3;
            case 'ro.ru': return 4;
            case 'rambler.ua': return 5;
            default: return 0;
        }
    }
}

export default App;