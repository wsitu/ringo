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
    
    /* Takes in another WordDictionary or object with name and words keys where:
           name stores a string identifier for the dictionary
           words stores an object { aWord: { part: {}, def: ""}, ... }
           * for more info on part and def see WordData's parts and definition
       The input is deep copied but if the input is another WordDictionary, the
       _index is recreated as the words are added. Note that the aWord keys in
       words is ignored and only the data is added. See this.add for more.
    */
    constructor(dict={name: "", words: {}}) {
        this.name = dict.name;
        this._words = {}
        this._index = {};
        // apply changes to this.JSON
        
        let words = (dict._words) ? dict._words : dict.words
        for (const data of Object.values(words))
            this.add(new WordData(data));
    }

    // Returns a set of every word in the dictionary
    get words() {
        return new Set(Object.keys(this._words));
    }
    
    // Returns true if the dictionary has an entry for wordString
    has(wordString) {
        return wordString in this._words;
    }
    
    // Returns the WordData of wordString if found or undefined
    getData(wordString) {
        return this._words[wordString];
    }
    
    // Adds the WordData to the dictionary located by its word text
    // Overwrites previous entries with the same word text
    add(wordData) {
        let word = wordData.text;
        if (this.has(word)) this.delete(word);
        this._words[word] = wordData;
        this._indexWord(word);
    }
    
    // Removes the word and its data from the dictionary
    delete(wordString) {
        this._unindexWord(wordString);
        delete this._words[wordString];
    }
    
    // Returns a set of kanji from every word in the dictionary or empty set
    //  * see WordData.kanji() for more
    get kanjis() {
        return new Set(Object.keys(this._index));
    }
    
    // Returns a set of words that kanjiString is in or an empty set
    wordsWith(kanjiString) {
        if (!this._index[kanjiString]) return new Set();
        return new Set(this._index[kanjiString]);
    }

    // Store an index of the kanji in wordString
    // Input: <ignore> array of characters to ignore    
    _indexWord(wordString, ignore = []) {
        let data = this.getData(wordString);
        for (let character of data.kanji){
            if (ignore.includes(character)) continue;
            if (!this._index[character]) 
                this._index[character] = new Set();
            this._index[character].add(wordString);
        } 
    }
    
    // Removes the index of wordString
    _unindexWord(wordString) {
        let data = this.getData(wordString);
        if (!data) return;
        for (let character of data.kanji){
            if (this._index[character]) {
                this._index[character].delete(wordString);
                if (this._index[character].size == 0)
                    delete this._index[character];
            }
        } 
    }

    // This class is a wrapper for data so output as it was input
    toJSON() {
        return {name: this.name, words: this._words};
    }
    
}

class WordData {
    
    // Takes in an object with part and def keys (raw data) or another WordData
    // The part and def data are copied, see the getter of each for more info
    constructor(data = {part: [], def: ""}) {
        let part = (data._part) ? data._part : data.part;
        this._part = part.map( p => {return {...p}} );
        this._def = (data._def) ? data._def : data.def;
        // apply changes to this.JSON
    }
    
    // Returns a copy of the array of text and reading data of the format:
    // [{text: string_part_of_word, read: string_reading_of_text}, ... ]
    get parts() {
        return this._part.map( p => {return {...p}} );
    }
    
    // Returns a string of the definition of the word
    get definition() {
        return this._def;
    }
    
    // Returns a string of the word represented by this data
    get text() {
        return this._part.map(part => part.text).join("");
    }
    
    // Returns a set of kanji(string) used in the word
    // For flexibility a kanji is any char in .text with a non empty reading
    // if there are complications restrict it to unicode value range instead.
    get kanji() {
        let hasReading = this._part.filter(part => part.read);
        let characters = hasReading.flatMap(part => [...part.text]);
        return new Set(characters);
    }
    
    // This class is a wrapper for data so output as it was input
    toJSON() {
        return {part: this._part, def: this._def};
   }
    
}
