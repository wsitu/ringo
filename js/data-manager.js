/*
Custom errors necessary?
    + encapsulation to localStorage and file i/o if it will be under this class
    + typing compared to listing multiple errors everytime 
    - self documentation, more generalization = inferring meaning of error by context
    - time designing around all relevant effors for a small application

class DataManagerError extends Error {
    constructor(message) {
        super.message = message;
        this.name = this.constructor.name;
    }
}

split into read/write if implemented
*/

class DataManager {
    constructor(words, labels) {
        this.loadWords([words]);
    }
    
    addDictionary(dict) {
        if (this.dictionaries)
            this.dictionaries[dict.name] = dict;
        else
            this.dictionaries = {[dict.name]: dict};
    }
    
    getDictionary(name) {
        return this.dictionaries[name];
    }
    
    loadWords(dicts) {
        for (let i = 0; i < dicts.length; i++)
            this.addDictionary(dicts[i]);
    }
    
    indexWords() {
    }
    
}