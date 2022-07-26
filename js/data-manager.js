(()=>{ //======================================================================
//=============================================================================


class Accuracy {
    // Stores an accuracy as two numbers representing the right and total
    // amount. Input is an array of [right, total] or an Accuracy object.
    constructor(data = [0, 0]) {
        this.right = (data.right == undefined) ? data[0] : data.right;
        this.total = (data.total == undefined) ? data[1] : data.total;
    }
    
    get ratio() { return this.right / this.total; }
    
    get ratioWrong() { return this.wrong / this.total; }

    get wrong() { return this.total - this.right; }
    
    // <other> may be an array of [right, total] or another Accuracy
    add(other) {
        this.right += (other.right == undefined) ? other[0] : other.right;
        this.total += (other.total == undefined) ? other[1] : other.total;
    }
    
    // Returns as a string with <digit> decimal places or -1 for no limit
    percent(digits = -1) {
        let percent = this.ratio * 100;
        return `${digits < 0 ? percent : percent.toFixed(digits)}%`;
    }
    
    // Returns as a string with <digit> decimal places or -1 for no limit
    percentWrong(digits = -1) {
        let percent = this.ratioWrong * 100;
        return `${digits < 0 ? percent : percent.toFixed(digits)}%`;
    }
    
    toJSON() {
        // Uses less characters as an array
        return [this.right, this.total];
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
    
    //TODO: when implementing user dictionaries refactor and store dictionaries
    //into a map by name and save them into local storage with prefix + name
    constructor() {
        this.default = {};
        this.user = {};
        for (const setting of [this.default, this.user]) {
            setting.dictionaries = [];
        }
        this.user.accuracies = new Map();
        this.user.config = new Map();
        window.addEventListener("storage", (e) => this._onStorageChange(e));
    }
    
    static _CONFIG_PREFIX = "CONFIG_";
    static _KANJI_PREFIX = "K__";
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
    
    /*get dictNames() {
        return this.dictionaries.map(x => x.name);
    }*/

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
    
    clearUserStorage() {
        try {
            localStorage.clear();
        } catch (err) {
            throw new DataManagerError(err);
        }
    }
    
    // Return the dictionary named nameString or null
    /*getDict(nameString) {
        for (let i = 0; i < this.dictionaries.length; i++)
            if (this.dictionaries[i].name == nameString)
                return this.dictionaries[i];
        return null;
    }*/
    
    // Returns an Accuracy and caches it or undefined if not found
    getUserAcc(aString) {
        let stored = this._getUser(this._accKey(aString));
        if (stored == null) return undefined;
        try {
            stored = new Accuracy(JSON.parse(stored));
        } catch (err) {
            if (err instanceof SyntaxError) {
                console.warn("Invalid Accuracy:", stored, "at key:", aString);
                return undefined;
            }
        }
        this.user.accuracies.set(aString, stored);
        return stored;
    }
    
    // Returns a string or the type defined at parseConfig() or undefined
    getUserConfig(aString) {
        let stored = this._getUser(this._configKey(aString));
        if (stored == null) return undefined;
        let parsed = this.parseConfig(aString, stored);
        this.user.config.set(aString, parsed);
        return parsed;
    }
    
    // Returns true if localStorage is useable or full
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
    
    // Loads ALL user and config data in localStorage into this.user
    loadUserData() {
        for (const [key, value] of Object.entries(localStorage)) {
            if (this._isAccKey(key))
                this.getUserAcc(this._accString(key));
            else if (this._isConfigKey(key))
                this.getUserConfig(this._configString(key));
        }
    }
    
    // Parse and cache the user dictionary data stored in local storage 
    /*loadUserDict() {
        let data = JSON.parse(this._getUser(DataManager._DICTIONARY_KEY));
        if (!data) return;
        this.user.dictionaries = data.map(dict => new WordDictionary(dict));
    }*/
    
    // Converts the stored config value to the preferred type for convenience
    // isntead of converting it everytime when read
    parseConfig(key, value) {
        switch (key) {
            case "score":
                return Number(value);
        }
        return value;
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
    
    removeUserAcc(aString) {
        this._removeUser(this._accKey(aString));
        this.user.accuracies.delete(aString);
    }
    
    removeUserConfig(aString) {
        this._removeUser(this._configKey(aString));
        this.user.config.delete(aString);
    }
    
    saveUserAcc(aString, accObj) {
        if (!(accObj instanceof Accuracy)) {
            console.error("Attempt to save invalid Accuracy:", accObj, 
                "on key:", aString);
            return;
        }
        if (!(typeof aString == "string" || aString instanceof String) || 
            aString == "") {
            console.error("Attempt to save invalid key:", aString, 
                "with:", accObj);
            return;
        }
        
        this.user.accuracies.set(aString, accObj);
        this._setUser(this._accKey(aString), JSON.stringify(accObj));
    }
    
    // Save miscellaneous user data <value> at aString in local storage and
    // the cache. aString cannot be the empty string.
    saveUserConfig(aString, value) {
        if (!(typeof aString == "string" || aString instanceof String) || 
            aString == "") {
            console.error("Attempt to save invalid key:", aString, 
                "with:", value);
            return;
        }
        this.user.config.set(aString, value);
        let str = this.stringifyConfig(aString, value);
        this._setUser(this._configKey(aString), str);
    }
    
    /* Save the cached user dictionaries into local storage or throws a 
       DataManagerError. Will delete the stored dictionaries if loaduserDict()
       is not called first.
    */
    /*saveUserDict() {
        if (this.user.dictionaries.length == 0) {
            this._removeUser(DataManager._DICTIONARY_KEY);
            return;
        }
        let data = JSON.stringify(this.user.dictionaries);
        this._setUser(DataManager._DICTIONARY_KEY, data);
    }*/
    
    // For parseConfig() types that do not easily store into localStorage
    stringifyConfig(key, value) {
        // no data that needs explicit conversion at this time
        // switch (key) {}
        return value;
    }
    
    _accKey(accString) {
        return DataManager._KANJI_PREFIX + accString;
    }
    
    _accString(accKey) {
        return accKey.substring(DataManager._KANJI_PREFIX.length);
    }
    
    _configKey(configString) {
        return DataManager._CONFIG_PREFIX + configString;
    }
    
    _configString(configKey) {
        return configKey.substring(DataManager._CONFIG_PREFIX.length);
    }

    // Returns null if not found, can avoid errors with hasUserStorage()
    _getUser(keyString) {
        try {
            return localStorage.getItem(keyString);
        } catch (err) {
            throw new DataManagerError(err);
        }
    }
    
    _isAccKey(aString) {
        return aString.startsWith(DataManager._KANJI_PREFIX);
    }
    
    _isConfigKey(aString) {
        return aString.startsWith(DataManager._CONFIG_PREFIX);
    }
    
    // Mirror localStorage changes from other pages to this page's cache
    _onStorageChange(storageEvent) {
        if (storageEvent.key == null) {
            if (localStorage.length == 0) { // clearUserStorage()
                this.user.accuracies.clear();
                this.user.config.clear();
            }
            return;
        }
        if (this._isAccKey(storageEvent.key)) {
            if (storageEvent.newValue == null)
                this.user.accuracies.delete(this._accString(storageEvent.key));
            else
                this.getUserAcc(this._accString(storageEvent.key));
        } if (this._isConfigKey(storageEvent.key)) {
            if (storageEvent.newValue == null)
                this.user.config.delete(this._configString(storageEvent.key));
            else
                this.getUserConfig(this._configString(storageEvent.key));
        }
    }
    
    // Always make sure to catch errors
    _setUser(keyString, valueString) {
        try {
            localStorage.setItem(keyString, valueString);
        } catch (err) {
            throw new DataManagerError(err);
        }
    }
    
    // Does nothing if not found, always make sure to catch errors
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
    
    // Returns a string of the word in HTML format using the ruby element
    toHTML() {
        let components = ["<ruby>"];
        for (const part of this.parts) {
            components.push(part.text);
            components.push(`<rt>${part.read}</rt>`);
        }
        components.push("</ruby>");
        return components.join("");
    }
    
    // This class is a wrapper for data so output as it was input
    toJSON() {
        return {part: this._part, def: this._def};
   }
    
}


ringo.Accuracy = Accuracy;
ringo.DataManager = DataManager;
ringo.DataManagerError = DataManagerError;
ringo.WordData = WordData;
ringo.WordDictionary = WordDictionary;
//=============================================================================
})(); //=======================================================================