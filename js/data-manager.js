
class Accuracy {
    
    constructor(data = [0, 0]) {
        this.key = data.key;
        this.right = data.right ? data.right: data[0];
        this.total = data.total ? data.total: data[1];
    }
    
    // Returns the wrong count
    get wrong() { return this.total - this.right; }
    
    // Returns the accuracy as a ratio
    get ratio() { return this.right / this.total; }
    
    // Returns the error rate as a ratio
    get ratioWrong() { return this.wrong / this.total; }
    
    // Adds another Accuracy's data to this, does not modify the key
    add(otherAcc) {
        this.right += otherAcc.right;
        this.total += otherAcc.total;
    }
    
    // Returns a string of the accuracy as a percentage
    // <digits> number of digits after the decimal point or -1 for no limit
    percent(digits = -1) {
        let percent = this.ratio * 100;
        return `${digits < 0 ? percent : percent.toFixed(digits)}%`;
    }
    
    // Returns a string of the accuracy as a percentage
    // <digits> number of digits after the decimal point or -1 for no limit
    percentWrong(digits = -1) {
        let percent = this.ratioWrong * 100;
        return `${digits < 0 ? percent : percent.toFixed(digits)}%`;
    }
}

// Wrapper for errors related to usage of local DOM storage or files
class DataManagerError extends Error {
    constructor(errorObj) {
        super(`[${errorObj.name}] ${errorObj.message}`);
        this.name = this.constructor.name;
    }
}

class DataManager {
    /* Manages data to be split between those that are default and those that
       are user loaded. Additionally provides an interface to save and load 
       user data.
       
       The user data should be loaded before modification, then saved. 
       Multiple instances of DataManager will access and modify the same user
       data in local storage.
    */
    
    constructor() {
        this.default = {};
        this.user = {};
        for (const setting of [this.default, this.user]) {
            setting.dictionaries = [];
        }
    }
    
    static _TEST_STORAGE_KEY = "__TESTSTORAGEKEY__";
    static _TEST_STORAGE_VALUE = "テst";
    static _DICTIONARY_KEY = "dict"
    
    get settings() {
        return [this.default, this.user];
    }
    
    // Return a new array of all the dictionaries added
    get dictionaries() {
        return this.default.dictionaries.concat(this.user.dictionaries);
    }
    
    // Return a new array of the names of all the dictionaries added
    get dictNames() {
        return this.dictionaries.map(x => x.name);
    }
    
    // Return the dictionary named nameString or null
    getDict(nameString) {
        for (let i = 0; i < this.dictionaries.length; i++)
            if (this.dictionaries[i].name == nameString)
                return this.dictionaries[i];
        return null;
    }
    
    /* Add wordDictionary to user dictionaries if isUser otherwise to default
       If wordDictionary is not a WordDictionary object, it will copy it and 
       create one to be added.
    */
    addDict(wordDictionary, isUser = true) {
        if( !(wordDictionary instanceof WordDictionary))
            wordDictionary = new WordDictionary(wordDictionary);
        this.removeDict(wordDictionary.name);
        if (isUser)
            this.user.dictionaries.push(wordDictionary);
        else
            this.default.dictionaries.push(wordDictionary);
    }
    
    // Remove the dictionary named nameString if there is one
    removeDict(nameString) {
        for (const setting of this.settings) {
            let dicts = setting.dictionaries;
            for (let i = 0; i < dicts.length; i++)
                if (dicts[i].name == nameString)
                    dicts.splice(i, 1);
        }
    }

    // Return true if the user's local storage is accessible or full
    // otherwise false
    hasUserStorage() {
        let storage = localStorage;
        try {
            storage.setItem(DataManager._TEST_STORAGE_KEY, 
                            DataManager._TEST_STORAGE_VALUE);
            storage.getItem(DataManager._TEST_STORAGE_KEY);
            storage.removeItem(DataManager._TEST_STORAGE_KEY);
            return true;
        } catch (err) {
            // May be useable if there is a storage full error but is not empty
            if (err instanceof DOMException) {
                // QuotaExceededError is experimental and code is deprecated
                if (err.name == "QuotaExceededError" || err.code == 22)
                    if (storage && storage.length > 0)
                        return true;
            }
            return false;
        }
    }
    
    // Parse and cache the user dictionary data stored in local storage 
    loadUserDict() {
        let data = JSON.parse(this._getUser(DataManager._DICTIONARY_KEY));
        if (!data) return;
        this.user.dictionaries = data.map(dict => new WordDictionary(dict));
    }
    
    /* Save the cached user dictionaries into local storage or throws a 
       DataManagerError. Will delete the stored dictionaries if loaduserDict()
       is not called first.
    */
    saveUserDict() {
        if (this.user.dictionaries.length == 0) {
            this._removeUser(DataManager._DICTIONARY_KEY);
            return;
        }
        let data = JSON.stringify(this.user.dictionaries);
        this._setUser(DataManager._DICTIONARY_KEY, data);
    }
    
    clearUserStorage() {
        try {
            localStorage.clear();
        } catch (err) {
            throw new DataManagerError(err);
        }
    }
    
    // Return the value stored in local storage at keyString or null
    _getUser(keyString) {
        try {
            return localStorage.getItem(keyString);
        } catch (err) {
            throw new DataManagerError(err);
        }
    }
    
    // Store valueString at keyString in local storage or throw a
    // DataManagerError containing the message of the original error
    _setUser(keyString, valueString) {
        try {
            localStorage.setItem(keyString, valueString);
        } catch (err) {
            throw new DataManagerError(err);
        }
    }
    
    // Remove keyString from local storage or do nothing
    _removeUser(keyString) {
        try {
            localStorage.removeItem(keyString);
        } catch (err) {
            throw new DataManagerError(err);
        }
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
    get kanjiList() {
        return new Set(Object.keys(this._index));
    }
    
    // Returns a set of words that kanjiString is in or an empty set
    wordsWith(kanjiString) {
        if (!this._index[kanjiString]) return new Set();
        return new Set(this._index[kanjiString]);
    }

    // Store an index of the kanji in wordString 
    _indexWord(wordString) {
        let data = this.getData(wordString);
        for (let character of data.kanji){
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
