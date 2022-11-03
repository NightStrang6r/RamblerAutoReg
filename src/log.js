import c from 'chalk';

const logo = `
 █████╗ ██╗   ██╗████████╗ ██████╗     ██████╗ ███████╗ ██████╗ 
██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗    ██╔══██╗██╔════╝██╔════╝ 
███████║██║   ██║   ██║   ██║   ██║    ██████╔╝█████╗  ██║  ███╗
██╔══██║██║   ██║   ██║   ██║   ██║    ██╔══██╗██╔══╝  ██║   ██║
██║  ██║╚██████╔╝   ██║   ╚██████╔╝    ██║  ██║███████╗╚██████╔╝
╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝     ╚═╝  ╚═╝╚══════╝ ╚═════╝ 
(Rambler)\n`;

const version = `v1.1.0`;
const by = 'By NightStranger\n';

setTerminalTitle('RamblerAutoReg by NightStranger');
printLogo();

function setTerminalTitle(title) {
    process.stdout.write(
        String.fromCharCode(27) + "]0;" + title + String.fromCharCode(7)
    );
}

function printLogo() {
    console.log(`\x1b[5m${logo}\x1b[0m`);
    console.log(c.cyan(version));
    console.log(c.magenta(by));
}

function log(msg, err = false) {
    const date = new Date();

    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    let hour = date.getHours();
    let minute = date.getMinutes();
    let second = date.getSeconds();

    if(day.toString().length == 1)
        day = `0${day}`;
    if(month.toString().length == 1)
        month = `0${month}`;
    if(hour.toString().length == 1)
        hour = `0${hour}`;
    if(minute.toString().length == 1)
        minute = `0${minute}`;
    if(second.toString().length == 1)
        second = `0${second}`;

    const dateString = `[${day}.${month}.${year}]`;
    const timeString = `[${hour}:${minute}:${second}]`;
    const logText = `${c.yellow('>')} ${c.cyan(dateString)} ${c.cyan(timeString)}: ${msg}`;

    if(!err) {
        console.log(logText);
    } else {
        console.error(logText);
    }

    if(typeof msg == 'object')
        console.log(msg);
}

export default log;