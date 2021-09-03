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
        this.dictionaries = {};
        this.index = {};
        this.loadWords([words]);
    }
    
    addDictionary(dict) {
        this.dictionaries[dict.name] = dict;
    }
    
    getDictionary(name) {
        return this.dictionaries[name];
    }
    
    loadWords(dicts) {
        for (let i = 0; i < dicts.length; i++)
            this.addDictionary(dicts[i]);
    }
    
    // Ouput: an object with kanji and the the words it is found in
    // Input: <dict> dictionary of words, <ignore> array of characters to ignore
    /* For more flexibility this function indexes every character in a text
       with a non empty reading, not in <ignore>. If necessary, filter
       characters by kanji unicode value range instead. */
    indexDictionary(dict, ignore = []) {
        let index = {}
        for (const [word, info] of Object.entries(dict.words)) {
            for (let i = 0; i < info.part.length; i++) {
                let part = info.part[i];
                if (!part.read) continue;
                for (let character of part.text) {
                    if (ignore.includes(character)) continue;
                    if (index[character])
                        index[character].push(word);
                    else
                        index[character] = [word];
                }
            }
        }
        return index;
    }
    
}