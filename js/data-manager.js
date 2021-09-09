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
        this.dictOrder = [];
        this.index = {};
        this.loadWords([words]);
    }
    
    
    addDictionary(data) {
        let dict = new WordDictionary(data);
        dict.indexDictionary();
        this.dictionaries[dict.name] = dict;
        let i = this.dictOrder.indexOf(dict.name);
        if (i != -1) this.dictOrder.splice(i, 1);
        this.dictOrder.push(dict.name);
    }
    
    removeDictionary(dictName) {
        delete this.dictionaries[dictName];
        let i = this.dictOrder.indexOf(dictName);
        if (i != -1) this.dictOrder.splice(i, 1);
    }
    
    getDictionary(dictName) {
        return this.dictionaries[dictName];
    }
    
    getDictionaryOrder() {
        return this.dictOrder;
    }
    
    loadWords(dicts) {
        for (let i = 0; i < dicts.length; i++)
            this.addDictionary(dicts[i]);
    }

}

class WordDictionary {
    constructor(dict={name: "", words: {}}) {
        this.name = dict.name;
        this.words = dict.words;
        this.index = {};
    }
    
    getIndex() {
        return this.index;
    }
    
    // Indexes every word in the dictionary by the kanjis used
    // * see indexWord for more details
    // Input: <ignore> array of characters to ignore   
    indexDictionary(ignore = []) {
        for (const [word] of Object.entries(this.words))
            this.indexWord(word, ignore);
    }
    
    // Store an index of the word by the kanjis used in it
    // Input: <word> the word to index
    //        <ignore> array of characters to ignore    
    /* For more flexibility this function indexes every character in a text
       with a non empty reading, not in <ignore>. If necessary, filter
       characters by kanji unicode value range instead. */
    indexWord(word, ignore = []) {
        let wordParts = this.words[word].part;
        for (let i = 0; i < wordParts.length; i++) {
            let part = wordParts[i];
            if (!part.read) continue;
            for (let character of part.text) {
                if (ignore.includes(character)) continue;
                if (this.index[character])
                    this.index[character].push(word);
                else
                    this.index[character] = [word];
            }
        }
        
    }
    
    /*
    toJSON() {
    }
    */
}