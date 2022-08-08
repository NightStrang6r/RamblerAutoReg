class Password {
    generate(length) {
        const upper = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
        const lower = "abcdefghijkmnopqrstuvwxyz";
        const numbers = "0123456789";
    
        let symbols = upper + lower + numbers;
        let password = "";
        
        for (let i = 0; i < length; i++) {
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
}

export default Password;