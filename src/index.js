const puppeteer = require('puppeteer');
const read = require('readline-sync');

const url = `https://id.rambler.ru/login-20/mail-registration?utm_source=head&utm_campaign=self_promo&utm_medium=header&utm_content=mail&rname=mail&theme=&session=false&back=https%3A%2F%2Fmail.rambler.ru%2F%3Futm_source%3Dhead%26utm_campaign%3Dself_promo%26utm_medium%3Dheader%26utm_content%3Dmail&param=embed&iframeOrigin=https%3A%2F%2Fmail.rambler.ru`;
const readyPage = `https://id.rambler.ru/login-20/mail-registration/completion`;

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
    read.setDefaultOptions({encoding: 'ascii'});

    const email = read.question("Введите логин email (без rambler.ru): ");
    const passLength = +read.question("Введите желаемую длину пароля: ");

    browser = await puppeteer.launch({
        headless: false,
        args:[
            '--start-maximized'
        ],
        defaultViewport: null
    });

    const pass = generatePassword(passLength);

    const res = await reg(email, pass, '123456');

    if(res) {
        console.log(`Почта зарегистрирована: `);
        console.log(res);
    }
    
    browser.close();
}

async function reg(email, pass, code) {
    let result = false;

    try {
        const pages = await browser.pages();
        const page = pages[0];
        await page.goto(url);
        //console.log(page);
        
        //await page.waitForNavigation({waitUntil: 'networkidle2'});

        await page.waitForSelector(selectors.mail);
        await page.type(selectors.mail, email, {delay: 20});

        await page.type(selectors.pass, pass, {delay: 20});

        await page.type(selectors.passVerify, pass, {delay: 20});

        await page.click(selectors.questionType);

        await page.waitForSelector(selectors.questionSelect);
        await sleep(100);
        await page.click(selectors.questionSelect);

        await page.type(selectors.questionAnswer, code, {delay: 20});

        /*await page.evaluate(async (selectors) => {
            while(document.querySelector(selectors.hCapcha) == null && document.querySelector(selectors.hCapcha).ariaChecked != "true") {
                await sleep(500);
            }

            async function sleep(timeout) {
                return new Promise((resolve) => {
                    setTimeout(resolve, timeout);
                });
            }
        }, selectors);
        
        await page.click(selectors.submit);*/
        
        while(!(await page.target()._targetInfo.url).includes(readyPage)) {
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