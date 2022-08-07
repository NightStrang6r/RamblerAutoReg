import puppeteer from 'puppeteer';
import read from 'readline-sync';
import { load } from './storage.js';
import { execFile } from 'child_process';
import path from 'path';
import c from 'chalk';
import fs from 'fs';
import log from './log.js'
import inquirer from 'inquirer';

class App {
    constructor() {
        this.config = load('config.json');
        this.browser = null;

        this.selectors = {
            mail: "#login",
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
            log(c.red(`Chrome not found. Exiting...`));
            return;
        }
        
        let regMode = await this.askRegMode();

        if(regMode == 'Load data from file') {
            log(c.red('In development...'));
            return;
        } else {
            await this.regByGenerate();
        }
    }

    async regByGenerate() {
        let answers = await this.ask();
        let login = answers.mailLogin;
        let passLength = +answers.passLength;
        let emailsCount = +answers.emailsCount;
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
    
        const accounts = await this.generateAccounts(login, passLength, emailsCount, startValue);
    
        this.browser = await puppeteer.launch({
            executablePath: this.chromePath,
            headless: false,
            args:[
                '--start-maximized'
            ],
            defaultViewport: null
        });
    
        for(let i = 0; i < accounts.length; i++) {
            const acc = accounts[i];
            const res = await this.reg(acc.login, acc.pass, acc.code);
        
            if(res) {
                log(`Почта #${(i + 1)} зарегистрирована: `);
                log(acc.email);
                log(acc.pass);
            }
        }
        
        this.browser.close();
    }

    async askRegMode() {
        const questions = 
        [{
            name: 'regMode',
            type: 'list',
            message: 'Select registration mode:',
            choices: ['Load data from file', 'Enter login, email count and generate passwords']
        }];

        const answers = await inquirer.prompt(questions);
        return answers.regMode;
    }

    async ask() {
        const questions = 
        [{
            name: 'mailLogin',
            type: 'input',
            message: 'Enter mail login (before @):'
        }, {
            name: 'passLength',
            type: 'number',
            message: 'Enter pass length (15 by default):',
            default() {
                return 15;
            }
        }, {
            name: 'emailsCount',
            type: 'number',
            message: 'Enter count of mails to register (1 by default):',
            default() {
                return 1;
            }
        }];

        const answers = await inquirer.prompt(questions);
        return answers;
    }

    generateAccounts(login, passLength, emailsCount, startValue) {
        let accounts = [];
    
        for(let i = startValue; i < emailsCount + startValue; i++) {
            let currentLogin = login;

            if(emailsCount != 1) {
                currentLogin = `${login}${i}`;
            }
    
            const email = `${currentLogin}@rambler.ru`;
            const pass = this.generatePassword(passLength);
    
            accounts[accounts.length] = {
                login: currentLogin,
                email: email,
                pass: pass,
                code: this.config.code
            };
        }

        return accounts;
    }

    async reg(email, pass, code) {
        let result = false;
    
        try {
            const pages = await this.browser.pages();
            const page = pages[0];
            await page.goto(this.config.url);
    
            await page.waitForSelector(this.selectors.mail);
            await page.type(this.selectors.mail, email, {delay: 20});
    
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
                        if(capchaResp == "") return;
                        resolve(capchaResp);
                    }, 200);
                });
            });
            
            await page.click(this.selectors.submit);
            
            while(!(await page.target()._targetInfo.url).includes(this.config.readyPage)) {
                await this.sleep(500);
            }
            await this.deleteCookies(page);
    
            result = {
                email: `${email}@rambler.ru`,
                pass: pass,
                code: code
            };
        } catch (err) {
            console.log(`Ошибка при регистрации почты: ${err}`);
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

    generatePassword(length) {
        const upper = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
        const lower = "abcdefghijkmnopqrstuvwxyz";
        const numbers = "0123456789";
    
        let symbols = upper + lower + numbers;
        let password = "";
        
        for (var i = 0; i < length; i++) {
            password += symbols.charAt(this.rand(symbols.length)); 
        }
    
        if(length >= 6) {
            for (let i = 0; i < 2; i++) {
                password = this.replaceAt(password, upper.charAt(this.rand(upper.length)), this.rand(password.length));
            }
            for (let i = 0; i < 2; i++) {
                password = this.replaceAt(password, lower.charAt(this.rand(lower.length)), this.rand(password.length));
            }
            for (let i = 0; i < 3; i++) {
                password = this.replaceAt(password, numbers.charAt(this.rand(numbers.length)), this.rand(password.length));
            }
        }
    
        return password;
    }

    replaceAt(string, replacement, index) {
        return string.substr(0, index) + replacement + string.substr(index + replacement.length);
    }

    rand(to) {
        return Math.floor(Math.random() * to);
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

                let result = stdout.split('exe=');
                result = result[result.length - 1];
                result = result.split('--single')[0];
                result = result.slice(0, result.length - 1);
                resolve(result);
            });
        });
        
        return promise;
    }

    
}

export default App;