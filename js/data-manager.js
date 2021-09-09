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
        this.dictionaries = [];
        this.loadWords([words]);
    }
    
    
    addDictionary(dict) {
        for (let i = 0; i < this.dictionaries.length; i++) {
            if (this.dictionaries[i].name == dict.name) {
                this.dictionaries.splice(i, 1);
                break;
            }
        }
        if (Object.keys(dict.index).length == 0) dict.indexDictionary();
        this.dictionaries.push(dict);
    }
    
    removeDictionary(dictName) {
        for (let i = 0; i < this.dictionaries.length; i++)
            if (this.dictionaries[i].name == dictName)
                return this.dictionaries.splice(i, 1)[0];
        return null;
    }
    
    getDictionary(dictName) {
        for (let i = 0; i < this.dictionaries.length; i++)
            if (this.dictionaries[i].name == dictName)
                return this.dictionaries[i];
        return null;
    }
    
    getDictionaryNames() {
        return this.dictionaries.map(x => x.name);
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