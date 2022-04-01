import puppeteer from 'puppeteer';
import read from 'readline-sync';
import { exec } from "child_process"
import { load } from "./storage.js";

const config = load('config.json');

const selectors = {
    mail: "#login",
    pass: "#newPassword",
    passVerify: "#confirmPassword",
    questionType: "input[placeholder='Выберите вопрос']",
    questionSelect: "div[data-cerber-id*='Почтовый индекс ваших родителей']",
    questionAnswer: "#answer",
    hCapcha: "#checkbox",
    submit: "button[type=submit]"
};
let browser;

main();

async function main() {
    await exec("chcp 65001");

    let login = read.question("Введите логин email (без rambler.ru): ");
    let passLength = +read.question("Введите желаемую длину пароля (стандартно 15): ");
    let emailsCount = +read.question("Введите количество регистрируемых почт (стандартно 1): ");
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

    let accounts = [];

    for(let i = startValue; i < emailsCount + startValue; i++) {
        if(emailsCount != 1) {
            login = `${login}${i}`;
        }

        const email = `${login}@rambler.ru`;
        const pass = generatePassword(passLength);

        accounts[accounts.length] = {
            login: login,
            email: email,
            pass: pass,
            code: config.code
        };
    }

    browser = await puppeteer.launch({
        headless: false,
        args:[
            '--start-maximized'
        ],
        defaultViewport: null
    });

    for(let i = 0; i < accounts.length; i++) {
        const acc = accounts[i];
        const res = await reg(acc.login, acc.pass, acc.code);
    
        if(res) {
            console.log(`Почта #${i} зарегистрирована: `);
            console.log(acc.email);
            console.log(acc.pass);
        }
    }
    
    browser.close();
}

async function reg(email, pass, code) {
    let result = false;

    try {
        const pages = await browser.pages();
        const page = pages[0];
        await page.goto(config.url);

        await page.waitForSelector(selectors.mail);
        await page.type(selectors.mail, email, {delay: 20});

        await page.type(selectors.pass, pass, {delay: 20});

        await page.type(selectors.passVerify, pass, {delay: 20});

        await page.click(selectors.questionType);

        await page.waitForSelector(selectors.questionSelect);
        await sleep(100);
        await page.click(selectors.questionSelect);

        await page.type(selectors.questionAnswer, code, {delay: 20});

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

        console.log(`Капча пройдена`);
        
        await page.click(selectors.submit);
        
        while(!(await page.target()._targetInfo.url).includes(config.readyPage)) {
            await sleep(500);
        }
        await deleteCookies(page);

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

async function deleteCookies(page) {
    const client = await page.target().createCDPSession();	
    await client.send('Network.clearBrowserCookies');
}

async function sleep(timeout) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}

function generatePassword(length) {
    /* Symbols without l and I, because sometimes they look the same */
    const upper = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const numbers = "0123456789";

    let symbols = upper + lower + numbers;
    let password = "";
    
    for (var i = 0; i < length; i++) {
        password += symbols.charAt(rand(symbols.length)); 
    }

    if(length >= 6) {
        for (let i = 0; i < 2; i++) {
            password = replaceAt(password, upper.charAt(rand(upper.length)), rand(password.length));
        }
        for (let i = 0; i < 2; i++) {
            password = replaceAt(password, lower.charAt(rand(lower.length)), rand(password.length));
        }
        for (let i = 0; i < 3; i++) {
            password = replaceAt(password, numbers.charAt(rand(numbers.length)), rand(password.length));
        }
    }

    return password;
}

function replaceAt(string, replacement, index) {
    return string.substr(0, index) + replacement + string.substr(index + replacement.length);
}

function rand(to) {
    return Math.floor(Math.random() * to);
}