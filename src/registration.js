import c from 'chalk';
import fs from 'fs';
import Storage from './storage.js';
import Ask from './ask.js';
import Password from './password.js';
import Chrome from './chrome.js';
import log from './log.js';

class Registration {
    constructor(chromePath) {
        this.chromePath = chromePath;

        this.ask = new Ask();
        this.chrome = new Chrome(this.chromePath);
        this.storage = new Storage();

        this.settings = this.storage.load('settings.json');
        this.links = this.storage.load('./src/links.json');

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

    async byFile() {
        if(!fs.existsSync(this.settings.mailsFile)) {
            fs.writeFileSync(this.settings.mailsFile, 'mail@rambler.ua:password:recoveryCode');
            log(`${c.cyan(`File ${this.settings.mailsFile} created. Fill it with mail data in the format:`)} ${c.green('mail@rambler.ua:password:recoveryCode')} ${c.cyan('Each mail on a new line. Then restart the program.')}`);
            return;
        }

        log(c.green(`File ${this.settings.mailsFile} found`));

        const mails = this.storage.parseMailsFile();
        if(!mails || ! mails.length) return;
        log(`Loaded ${mails.length} mails`);

        const toStart = await this.ask.askToStartRegistration();
        if(!toStart) return;

        this.regMails(mails, 'move');
    }

    async byGenerate() {
        let answers = await this.ask.ask();
        let login = answers.mailLogin;
        let domain = answers.domain;
        let passLength = +answers.passLength;
        let emailsCount = +answers.emailsCount;
        let code = answers.code;
        let startValue = 1;

        if(emailsCount > 1) {
            startValue = await this.ask.askMailStartValue(login);
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
        const toStart = await this.ask.askToStartRegistration();
        if(!toStart) return;

        this.regMails(mails, 'add');
    }

    async regMails(mails, toFile) {
        await this.chrome.launch();

        for(let i = 0; i < mails.length; i++) {
            const mail = mails[i];

            log(c.cyan(`[${(i + 1)}] Registering ${mail.login}...`));
            const res = await this.reg(mail.login, mail.domain, mail.pass, mail.code);
        
            if(res) {
                log(`${c.green(`[${(i + 1)}] Mail`)} ${c.magenta(mail.email)} ${c.green(`successfully registered:`)}`);
                log(mail.email);
                log(mail.pass);

                if(toFile == 'move') {
                    await this.storage.moveMailToRegisteredFile(mail.email);
                }

                if(toFile == 'add') {
                    await this.storage.addMailToRegisteredFile(mail.email);
                }
            } else {
                log(c.red(`Failed to register mail ${mail.email}`));
                const toContinue = await this.ask.askToContinue();

                if(!toContinue) break;
            }
        }
        
        await this.chrome.close();
    }

    async reg(login, domain, pass, code) {
        let result = false;
    
        try {
            const browser = this.chrome.getBrowser();
            const pages = await browser.pages();
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
            await this.chrome.deleteCookies(page);
    
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

    generateAccounts(login, domain, passLength, emailsCount, startValue, code) {
        let accounts = [];
        let password = new Password();
    
        for(let i = startValue; i < emailsCount + startValue; i++) {
            let currentLogin = login;

            if(emailsCount != 1) {
                currentLogin = `${login}${i}`;
            }
    
            const email = `${currentLogin}@${domain}`;
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

    async sleep(timeout) {
        return new Promise((resolve) => {
            setTimeout(resolve, timeout);
        });
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

export default Registration;