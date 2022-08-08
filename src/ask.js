import inquirer from 'inquirer';

class Ask {
    async askToStartRegistration() {
        const questions = 
        [{
            name: 'continue',
            type: 'confirm',
            message: 'Are you sure you want to start registration?'
        }];

        const answers = await inquirer.prompt(questions);
        return answers.continue;
    }

    async askToContinue() {
        const questions = 
        [{
            name: 'continue',
            type: 'confirm',
            message: 'Are you sure you want to continue?'
        }];

        const answers = await inquirer.prompt(questions);
        return answers.continue;
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
            name: 'domain',
            type: 'list',
            message: 'Choice mail domain (after @):',
            choices: [
                'rambler.ru', 
                'lenta.ru',
                'autorambler.ru',
                'myrambler.ru',
                'ro.ru',
                'rambler.ua'
            ]
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
        }, {
            name: 'code',
            type: 'input',
            message: 'Enter security code (123456 by default):',
            default() {
                return '123456';
            }
        }];

        const answers = await inquirer.prompt(questions);
        return answers;
    }
}

export default Ask;