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
        if (!dict.hasIndex()) dict.indexDictionary();
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
        this._index = {};
    }


    // Returns true if the dictionary has been indexed, else false
    hasIndex() {
         return (Object.keys(this._index).length > 0);
    }
    
    // Indexes every word in the dictionary by the kanjis used
    // Input: <ignore> array of characters to ignore   
    indexDictionary(ignore = []) {
        for (const [word] of Object.entries(this.words))
            this.indexWord(word, ignore);
    }
    
    // Clears the entire index for the dictionary
    unindexDictionary() {
        this._index = {};
    }
    
    // Store an index of the word by the kanjis used in it
    // Input: <word> the word to index
    //        <ignore> array of characters to ignore    
    indexWord(word, ignore = []) {
        let characters = this.kanjiFromWord(word);
        for (let c of characters){
            if (ignore.includes(c)) continue;
            if (!this._index[c]) 
                this._index[c] = new Set();
            this._index[c].add(word);
        } 
    }
    
    // Removes the index of the word
    // Input: <word> string of the word to index
    unindexWord(word) {
        let characters = this.kanjiFromWord(word);
        for (let c of characters){
            if (this._index[c]) {
                this._index[c].delete(word);
                if (this._index[c].size == 0)
                    delete this._index[c];
            }
        } 
    }

    // Returns a set of kanji used in the word
    // Input: <word> string of the word in the dictionary 
    /* For more flexibility this function indexes every character in a text
       with a non empty reading. If necessary, filter characters by kanji
       unicode value range instead. */
    kanjiFromWord(word) {
        let kanji = new Set();
        let wordParts = this.words[word].part;
        for (let i = 0; i < wordParts.length; i++) {
            let part = wordParts[i];
            if (!part.read) continue;
            for (let character of part.text) 
                kanji.add(character);   
        }
        return kanji;
    }
    
    // Returns a set of words containing <character> or an empty set
    // Input: <character> string of the character to search by
    wordsWith(character) {
        if (!this._index[character]) return new Set();
        return new Set(this._index[character]);
    }
    
    // Returns a set of every character used in all the words
    allCharacters() {
        return new Set(Object.keys(this._index));
    }
    
    /*
    toJSON() {
    }
    */
}