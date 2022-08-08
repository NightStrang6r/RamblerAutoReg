import c from 'chalk';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import log from './log.js';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

class Storage {
    constructor() {
        this.settings = this.loadSettings();
    }

    load(uri) {
        let result = false;
        try {
            uri = `${_dirname}/../${uri}`;
            
            if(!fs.existsSync(uri)) {
                fs.writeFileSync(uri, '');
                return '';
            }
    
            const rawdata = fs.readFileSync(uri);
            result = JSON.parse(rawdata);
        } catch (err) {
            console.log(`Ошибка при загрузке файла: ${err}`);
        }
        return result;
    }

    loadSettings() {
        const uri = `${_dirname}/../settings.json`;
        let data = null;

        if(!fs.existsSync(uri)) {
            data = {
                mailsFile: "mails.txt",
                registeredMailsFile: "registeredMails.txt"
            };

            fs.writeFileSync(uri, JSON.stringify(data, null, 4));
            return data;
        }

        data = fs.readFileSync(uri);
        const result = JSON.parse(data);

        return result;
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
    
    async addMailToRegisteredFile(mail) {
        if(!fs.existsSync(this.settings.registeredMailsFile)) {
            fs.writeFileSync(this.settings.registeredMailsFile, '');
            log(c.green(`File ${this.settings.registeredMailsFile} created`));
        }

        const mailString = `${mail.email}:${mail.pass}:${mail.code}`;
        const registeredMailsFile = fs.readFileSync(this.settings.registeredMailsFile);
        const newRegisteredMailsFile = registeredMailsFile.toString() + mailString + '\r\n';
        fs.writeFileSync(this.settings.registeredMailsFile, newRegisteredMailsFile);
    }
}

export default Storage;