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
        this.index[dict.name] = {};
    }
    
    getDictionary(name) {
        return this.dictionaries[name];
    }
    
    loadWords(dicts) {
        for (let i = 0; i < dicts.length; i++)
            this.addDictionary(dicts[i]);
    }
    
    getIndex(dictName) {
        return this.index[dictName];
    }
    
    // Indexes every word in the dictionary by the kanjis used
    // * see indexWord for more details
    // Input: <dictName> name of dictionary the word belongs to
    //        <ignore> array of characters to ignore   
    indexDictionary(dictName, ignore = []) {
        let dict = this.getDictionary(dictName);
        for (const [word] of Object.entries(dict.words))
            this.indexWord(dictName, word, ignore);
    }
    
    // Store an index of the word by the kanjis used in it
    // Input: <dictName> name of dictionary the word belongs to
    //        <word> the word to index
    //        <ignore> array of characters to ignore    
    /* For more flexibility this function indexes every character in a text
       with a non empty reading, not in <ignore>. If necessary, filter
       characters by kanji unicode value range instead. */
    indexWord(dictName, word, ignore = []) {
        let dict = this.getDictionary(dictName);
        let wordParts = dict.words[word].part;
        let index = this.getIndex(dictName);
        for (let i = 0; i < wordParts.length; i++) {
            let part = wordParts[i];
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
}