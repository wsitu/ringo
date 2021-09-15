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
        this._words = dict.words;
        this._index = {};
    }

    // Returns a set of every word in the dictionary
    allWords() {
        return new Set(Object.keys(this._words));
    }
    
    // Returns true if the dictionary has the word else false
    // Input: <word> string of the word to look for in the dictionary 
    hasWord(word) {
        return word in this._words;
    }
    
    // Returns an object {part: [], def: ""} containing the data of word
    //     part: an array of the text and reading components of the word
    //     def: the definition of the word
    // Input: <word> string of the word to get data from
    getData(word) {
        return {part: this.getReading(word), def: this.getDefinition(word)};
    }
    
    // Returns the reading of the word in an array of {text: "", read: ""}
    //     text: a character or characters of a part of the word
    //     read: the reading of the text
    // Input: <word> string of the word to get the reading from
    getReading(word) {
        return this._words[word].part.map( p => {return {...p}} );
    }
    
    // Returns a string of the definition of the word
    // Input: <word> string of the word to get the definition from
    getDefinition(word) {
        return this._words[word].def;
    }
    
    // Adds a word to the dictionary
    // Input: <word> string of the word to add
    //        <parts> array of objects representing the reading of word
    //        <definition> string of the word's definition
    addWord(word, parts, definition) {
        if (this.hasWord(word)) this.deleteWord(word);
        this._words[word] = {part: parts, def: definition};
        this.indexWord(word);
    }
    
    // Deletes a word from the dictionary
    // Input: <word> string of the word to be removed
    deleteWord(word) {
        this.unindexWord(word);
        delete this._words[word];
    }

    // Returns true if the dictionary has been indexed, else false
    hasIndex() {
         return (Object.keys(this._index).length > 0);
    }
    
    // Indexes every word in the dictionary by the kanjis used
    // Input: <ignore> array of characters to ignore   
    indexDictionary(ignore = []) {
        for (const [word] of Object.entries(this._words))
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
        let wordParts = this._words[word].part;
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

class WordData {
    constructor(part = [], definition = "") {
        this._part = part.map( p => {return {...p}} );
        this._def = definition;
    }
    
    get part() {
        return this._part.map( p => {return {...p}} );
    }
    
    get definition() {
        return this._def;
    }
    
    get text() {
        return this._part.map(part => part.text).join("");
    }
    
    get kanji() {
        let hasReading = this._part.filter(part => part.read);
        let characters = hasReading.flatMap(part => [...part.text]);
        return new Set(characters);
    }
    
    /*
    toJSON() {
    }
    */
}
