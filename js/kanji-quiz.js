const mainPage = {
    
    // Adds an object with a container HTML element to parentElement
    addTo(parentElement) {
        parentElement.appendChild(this.container);
    },

    /* Returns an element of the given tag, attribute, and content
       <elConfig> element config with the following keys
           tag:  (required) string of the type of html element to return
           attr: (optional) object representing html attribute: value
           text: (optional) string of the text content (not tml)
           html: (optional) string of the html content (overwrites text)
    */
    createElem(elConfig = {tag: "div", attr: {}, html: "", text: ""}) {
        let e = document.createElement(elConfig.tag);
        if (elConfig.text) e.textContent = elConfig.text;
        if (elConfig.html) e.innerHTML = elConfig.html;
        let attributes = elConfig.attr || {};
        for (const [key, value] of Object.entries(attributes))
            e.setAttribute(key, value);
        return e;
    },
    
    // Fades out elementToRemove over totalSeconds then runs callbackFunc
    //  * overwrites the inline display, opacity, and transition style
    fadeOut(elementToRemove, callbackFunc, totalSeconds = 0.25) {
        let runOnce = {
            ran: false,
            run: function() {
                if (this.ran == false) {
                    this.ran = true;
                    elementToRemove.style.display = "none";
                    if (callbackFunc)
                        callbackFunc();
                }
            }
        };
        elementToRemove.style.opacity = "0";
        elementToRemove.style.transition = `opacity ${totalSeconds}s`
        // Transition may not be available, setTimeout may not match the visual
        elementToRemove.addEventListener("transitionend", () => runOnce.run());
        setTimeout(() => runOnce.run(), totalSeconds*1000);
    },
    
    // Remove and transition from the inline properties used by fadeOut
    fadeIn(elementToRestore) {
        elementToRestore.style.removeProperty("display");
        let removeTransition = () => {
            elementToRestore.style.removeProperty("transition");
        }
        elementToRestore.addEventListener("transitionend", removeTransition);
        // delayed to work around display:none disabling transitions
        setTimeout(() => elementToRestore.style.removeProperty("opacity"), 5);
    },
    
    /* Returns an array of random weight shuffled mapObject keys 
       <mapobject> is a Map or object with a [key, value] iterator 
            value is the weight of key and is a real between [10^-4, 10^15]
    */
    weightedShuffle(mapObject) {
        let weightedOrder = x => [x[0], Math.pow(Math.random(), 1/x[1])];
        let shuffled = Array.from(mapObject, weightedOrder);
        shuffled.sort( (a, b) => b[1] - a[1] ); // High to low weightedOrder
        return shuffled.map(x => x[0]);
        
    /* Efraimidis & Spirakis: Weighted random sampling with a reservoir (2006)
       Probablity of random_1^(1 / weight_1) >= random_2^(1 / weight_2) is
       equal to weight_1 / (weight_1 + weight_2) so applying this function to
       every weight and sorting it descending produces a permutation of the
       keys without calculating the total weight.
       
       If slow use resevoir version that doesn't need to sort.
       
       If wider range of input is needed, use ln(random)/weight instead, seen
       in the blog post by Tim Vieira "Gumbel-max trick and weighted reservoir
       sampling (2014)." I don't know enough in this area to confirm the
       correctness but tests over 1 million iterations in JS show similar
       results while allowing weights around [10^-300, 10^300].
    */
    },
    
    // Return the wordData represented as a ruby element
    wordDataToRuby(wordData) {
        let ruby = document.createElement("ruby");
        if (wordData && wordData.parts) {
            for (const part of wordData.parts) {
                ruby.appendChild(document.createTextNode(part.text));
                let reading = document.createElement("rt");
                reading.textContent = part.read;
                ruby.appendChild(reading);
            }
        }
        return ruby;
    }
};

mainPage.Quiz = class {
    
    /* Creates a quiz for users to interact with from the dictionaries of words
       in the DataManager class passed in. Records the accuracy of each kanji
       based of the correctness of the user input and assigns a larger weight 
       to lower accuracy kanjis for future word selection.
       
       accChance    | [0, 1] chance that words are picked by kanji accuracy
       choiceRange  | object with {div: , min: , max: } where # of choices is
                    | floor(<score>/<div>) + <min> capped at <max>
       container    | parent element of all elements created by this
       dataManager  | source of WordData and interaction with local storage
       dictionaries | array of dictionaries to get WordData from
       entries      | array of current Entry that users can input to
       entryRange   | same as choiceRange but for the # of entries
       score        | number of times a quiz was submit as 100% correct 
       tempAccuracy | kanji accuracy of the current session(reset on page load)
    */
    constructor(dataManager) {
        this.accChance = 0.75;
        this.choiceRange  = {div: 2, min: 8, max: 20};
        this.container    = this.createElem("div", {class: "quiz"});
        this.dataManager  = dataManager;
        this.dictionaries = this.dataManager.dictionaries;
        this.entries      = [];
        this.entryRange   = {div: 4, min: 1, max: 10};
        this.score        = 0;
        this.tempAccuracy = new Map();

        this._kanjiCache; // reuse same copy of all kanjis per restart

        this._beginBtn   = this.createElem({tag: "button", attr: {class: "quiz-control-button"}});
        this._entriesBox = this.createElem({tag: "ul",  attr: {class: "quiz-entries"}});
        this._intro      = this.createElem({tag: "table"});
        this._introBox   = this.createElem({tag: "div", attr: {class: "quiz-intro"}});
        this._mainBox    = this.createElem({tag: "div"});
        this._submitBtn  = this.createElem({tag: "button", attr: {class: "quiz-control-button"}});
        
        this._init();
    }
    
    addTo = mainPage.addTo;
    createElem = mainPage.createElem;
    fadeIn = mainPage.fadeIn;
    fadeOut = mainPage.fadeOut;
    weightedShuffle = mainPage.weightedShuffle;
    Shuffler = mainPage.Shuffler;
    
    /* Returns a weight between [1, 3 000 000 000] when
       1 <= totalNum <= 1 000 000 000  and 0 <= rightNum <= totalNum
       A low totalNum or accuracy results in a higher weight
    */
    accuracyWeight(rightNum, totalNum) {
        let wrongRatio = (totalNum - rightNum)/totalNum;
        return (wrongRatio * wrongRatio + 0.5/totalNum) * 2000000000;
    }
    
    // Returns a set of every kanji used in all words of the dictionaries
    allKanji() {
        let total = new Set();
        for (const dict of this.dictionaries)
            dict.kanjiList.forEach( (kanji) => total.add(kanji) );
        return total;
    }
    
    // Replace current entries with ones from each wordDataArray element
    // each with random numberOfChoices 
    createEntries(wordDataArray, numberOfChoices) {
        this._entriesBox.replaceChildren();
        this.entries = [];
        let allKanji = new this.Shuffler(this._kanjiCache);
        for (const data of wordDataArray) {
            let entry = new this.Entry(data);
            entry.addTo(this._entriesBox);
            entry.shuffleInChoices(allKanji.random(numberOfChoices));
            this.entries.push(entry);
            allKanji.reset();
        }
    }
    
    // Fill the quiz intro with the information of each word in wordDataArray
    displayIntro(wordDataArray = []) {
        let words = this.createElem({tag: "tbody"});
        for (const data of wordDataArray) {
            let row = this.createElem({tag: "tr"});
            let wordText = this.createElem({tag: "th"});
            wordText.appendChild(mainPage.wordDataToRuby(data));
            let wordDef = this.createElem({tag: "td"});
            wordDef.textContent = data.definition;
            row.appendChild(wordText);
            row.appendChild(wordDef);
            words.appendChild(row);
        }
        this._intro.replaceChildren(words);
    }
    
    /* Returns an array of WordData from a mix of weighted and randomed kanji
       <numberOfWords> max number of words in the return
       <weightedChance> [0, 1.0] chance that a word comes from weighted shuffle
    */
    newWords(numberOfWords, weightedChance = 0.75) {
        let numOfWeighted = 0;
        for (let i = 0; i < numberOfWords; i++) {
            if (Math.random() < weightedChance)
                numOfWeighted++;
        }
        let words = this.weightedWords(numOfWeighted,);
        let randomed = this.randomWords(numberOfWords - words.size, [words]);
        randomed.forEach( (value, key) => words.set(key, value) );
        return Array.from(words.values());
    }
    
    // Returns an object containing the corrected of each fully set entry
    // in the format of { <kanji>: {right: #, total: #} }
    processEntries() {
        let rightTotal = {};
        let addRightTotal = function (key, right, total) {
            if (key in rightTotal) {
                rightTotal[key].right += right;
                rightTotal[key].total += total;
            } else
                rightTotal[key] = {right: right, total: total};
        }
        for (const entry of this.entries) {
            let result = entry.userInput.check();
            for (const part of result.right)
                addRightTotal(part, 1, 1);
            for (const part of result.wrong)
                addRightTotal(part, 0, 1);
        }
        return rightTotal;
    }
    
    /* Returns a Map of WordData.text : WordData of all WordDatas from the
       dictionaries that contain the input kanji.
       <kanjiString> only returns WordDatas whose .kanji contains this string
       <maxLength> the max number of words in the return
       <filters> array of Map(keys) or Set(values) of WordData.text to exclude
    */
    shuffledWordData(kanjiString, maxLength = Infinity, filters = []) {
        let data = new Map();
        for (const dict of this.dictionaries) {
            let words = dict.wordsWith(kanjiString);
            words.forEach( (word) => data.set(word, dict.getData(word)) );
        }
        for (const word of data.keys()) {
            for (const filter of filters) {
                if (filter.has(word)){
                    data.delete(word);
                    break;
                }
            }
        }
        let shuffler = new this.Shuffler(Array.from(data.values()), false);
        return shuffler.random(maxLength);
    }
    
    /* Returns a map of WordData.text : WordData randomly from random kanjis
       <maxLength> the max number of words in the return
       <filters> array of Map(keys) or Set(values) of WordData.text to exclude
    */
    randomWords(maxLength, filters = []) {
        let words = new Map();
        let blacklists = filters.concat(words);
        let randomed = new this.Shuffler(this._kanjiCache);
        while (words.size < maxLength) {
            let nextKanji = randomed.random(1);
            if (nextKanji.length < 1) break;
            let wordDatas = this.shuffledWordData(nextKanji[0], 1, blacklists)
            wordDatas.forEach( (wdData) => words.set(wdData.text, wdData) );
        }
        return words;
    }
    
    // Sets up a new quiz with new words
    restart() {
        let numFromScore = (rangeObj) => {
            return Math.min(rangeObj.max, 
                Math.floor(this.score/rangeObj.div) + rangeObj.min);
        }
        let delayedSetup = () => {
            this.fadeIn(this._introBox);
            this.createEntries(chosenWords, numFromScore(this.choiceRange));
        }
        this._kanjiCache = this.allKanji();
        let entryNum = numFromScore(this.entryRange);
        let chosenWords = this.newWords(entryNum, this.accChance);
        this.displayIntro(chosenWords);
        this.fadeOut(this._mainBox, delayedSetup);
    }
    
    // Saves accuracy data of entries for weighted shuffling
    // <accData> object in the same format as the return of processEntries()
    saveAccuracy(accData) {
        for (const kanji of Object.keys(accData)) {
            if (!this.tempAccuracy.has(kanji))
                this.tempAccuracy.set(kanji, {right: 0, total: 0});
            let data = this.tempAccuracy.get(kanji);
            data.right += accData[kanji].right;
            data.total += accData[kanji].total;
            // add to local storage here when ready to implement
        }
    }
    
    /* Returns a map of WordData.text : WordData randomly from kanjis by weight
       <maxLength> the max number of words in the return
       <filters> array of Map(keys) or Set(values) of WordData.text to exclude
    */
    weightedWords(maxLength, filters = []) {
        let words = new Map();
        let weightedKanji = [];
        if (maxLength > 0) {
            let weights = new Map();
            for (const [key, data] of this.tempAccuracy) 
                weights.set(key, this.accuracyWeight(data.right, data.total));
            weightedKanji = this.weightedShuffle(weights);
        }
        let blacklists = filters.concat(words);
        for (let i = 0; i < weightedKanji.length; i++) {
            if (words.size >= maxLength) break;
            let wordDatas = this.shuffledWordData(weightedKanji[i], 1, blacklists);
            wordDatas.forEach( (wdData) => words.set(wdData.text, wdData) );
        }
        return words;
    }
    
    // Parent child hierarchy setup
    _arrangeLayout() {
        this.container.appendChild(this._introBox);
        this.container.appendChild(this._mainBox);
        this._introBox.appendChild(this._intro);
        this._introBox.appendChild(this._beginBtn);
        this._mainBox.appendChild(this._entriesBox);
        this._mainBox.appendChild(this._submitBtn);
    }
    
    // One time setup on constructor
    _init() {
        let buttonText = "<ruby>次<rt>Next</rt></ruby>"
        this._beginBtn.innerHTML  = buttonText;
        this._submitBtn.innerHTML = buttonText;
        this._beginBtn.addEventListener("click", () => this._startQuiz());
        this._submitBtn.addEventListener("click", () => this._submitQuiz());
        this._mainBox.style.display = "none";
        this._arrangeLayout();
        this.restart();
    }
    
    // Hides the intro, displays the entries, and enables the submit button
    _startQuiz() {
        this._submitBtn.disabled = false;
        this.fadeOut(this._introBox, () => this.fadeIn(this._mainBox) );
    }
    
    // If all entries are set, processes the input on entries and restarts
    // Disables itself to prevent multiple calls on the same entries
    _submitQuiz() {
        for (const entry of this.entries) {
            if (!entry.userInput.hasAllSet()) {
                // add visual
                let headers = entry.container.getElementsByTagName("h2");
                if (headers.length > 0) headers[0].scrollIntoView();
                return;
            }
        }
        this._submitBtn.disabled = true;
        let result = this.processEntries();
        this.saveAccuracy(result);
        
        this.score++;
        for (const accuracy of Object.values(result)) {
            if (accuracy.right < accuracy.total) {
                this.score--;
                break;
            }  
        }
        this.restart();
    }
}

mainPage.Quiz.prototype.Entry = class {
    
    /* Creates an entry to display wordData's information but hides the
       components of the word among other false buttons.
    */
    constructor(wordData) {
        this.container = this.createElem({tag: "li", attr: {class: "quiz-entry"}});
        this.userInput = new this.Solution();
        
        this._CORRECTTEXT = "\u2714"; //check mark
        this._INCORRECTTEXT = "\u2716"; //X mark
        this._isLocked = false;
        this._wordData;
        
        this._answerBox = this.createElem({tag: "p",   attr: {class: "entry-answer"}});
        this._choiceBox = this.createElem({tag: "ul",  attr: {class: "entry-choices"}});
        this._headerBox = this.createElem({tag: "h2",  attr: {class: "entry-header"}});
        this._resultBox = this.createElem({tag: "p",   attr: {class: "entry-result"}});
        this._wordBox   = this.createElem({tag: "div", attr: {class: "entry-word"}});
        
        this._arrangeLayout();
        this.word = wordData;
        this._answerBox.style.display = "none";
        this._resultBox.style.display = "none";
    }
    
    addTo = mainPage.addTo;
    createElem = mainPage.createElem;
    fadeIn = mainPage.fadeIn;
    fadeOut = mainPage.fadeOut;
    Shuffler = mainPage.Shuffler;
    
    // Returns an array containing the string of each choice
    get choices() {
        let getButtonText = (e) => e.children[0].textContent;
        return Array.from(this._choiceBox.children, getButtonText);
    }
    
    // Sets each button's text in choices to those of arrayOfString
    // Will add or remove buttons to match the size of the array
    set choices(arrayOfString) {
        let inputButtonText = (e) => {
            if (this.locked) return;
            this.userInput.set(e.target.textContent);
            if (this.userInput.hasAllSet()) {
                this.locked = true;
            }
        }
        let buttons = this._choiceBox;
        let buttonsToAdd = arrayOfString.length - buttons.children.length;
        if (buttonsToAdd > 0) {
            for (let i = 0; i < buttonsToAdd; i++) {
                let listElement = this.createElem({tag: "li"});
                let btn = this.createElem({tag: "button"});
                btn.type = "button";
                btn.addEventListener("click", inputButtonText);
                listElement.appendChild(btn);
                buttons.appendChild(listElement);
            }
        } else {
            for (let i = 0; i > buttonsToAdd; i--)
                buttons.lastElementChild.remove();
        }
        
        for (let i = 0; i < buttons.children.length; i++)
            buttons.children[i].children[0].textContent = arrayOfString[i];
    }
    
    // Returns the header text of the entry
    get header() {
        return this._headerBox.textContent;
    }
    
    // Sets the header text for the entry
    set header(textContent) {
        this._headerBox.textContent = textContent;
    }
    
    // Returns whether the user can input to this entry
    get locked() {
        return this._isLocked;
    }
    
    // If true, prevents further user input and shows if the input is correct
    // If false, allows user input again
    set locked(aBool) {
        if (this._isLocked == aBool) return;
        this._isLocked = aBool;
        if (aBool == true) {
            this.fadeOut(this._choiceBox, () => this.displayResult());
        } else {
            let restoreUserInput = () => {
                this.fadeIn(this._choiceBox);
                this.userInput.resetInput();
            }
            if (this._answerBox.style.display != "none")
                this.fadeOut(this._answerBox, restoreUserInput);
            else if (this._resultBox.style.display != "none")
                this.fadeOut(this._resultBox, restoreUserInput);
        }
    }
    
    // Returns the WordData associated with the Entry
    get word() {
        return this._wordData;
    }
    
    // Sets the entry and all relevant properties to those of wordData
    set word(wordData) {
        this._wordData = wordData;
        if (!wordData) return;
        this.header = wordData.definition;
        this.userInput.word = wordData;
        this.shuffleInChoices();
    }

    // Hides the choices and shows whethter the user input was correct or not
    displayResult() {
        if (this.userInput.check().wrong.length == 0) {
            this._resultBox.textContent = this._CORRECTTEXT;
        } else {
            let replaceWithAnswer = () => { 
                this.fadeOut(this._resultBox, () => this.displayAnswer());
            }
            let btn = this.createElem({tag: "button"});
            btn.textContent = this._INCORRECTTEXT;
            btn.addEventListener("click", replaceWithAnswer);
            this._resultBox.replaceChildren(btn);
        }
        this.fadeIn(this._resultBox);
    }
    
    // Shows the word in the answer element
    displayAnswer() {
        this.userInput.markIncorrect();
        this._answerBox.replaceChildren(mainPage.wordDataToRuby(this.word));
        this.fadeIn(this._answerBox);
    }

    /* Shuffles in the answers with arrayOfString into the choices
    
       If no array is passed it will shuffle with the current choices.
       The choices will be at least the length of arrayOfString but may be
       longer if the length of array is smaller than the answers in which case
       the choices will only contain answers.
    */
    shuffleInChoices(arrayOfString=this.choices) {
        let targetLength = arrayOfString.length;
        let shuffle = new this.Shuffler(arrayOfString);
        let required = new Set(this.userInput.answers);
        let inserted = [...required];
        while (inserted.length < targetLength) {
            let next = shuffle.generator.next();
            if (next.done) break;
            if (required.has(next.value)) 
                required.delete(next.value);
            else
                inserted.push(next.value);
        }
        this.choices = new this.Shuffler(inserted).random();
    }
    
    _arrangeLayout() {
        //fix ruby not wrapping when it is a flex item
        let wordContainer = this.createElem({tag: "p"});
        this._wordBox.appendChild(wordContainer);
        
        this.userInput.addTo(wordContainer);
        let bodyBox = this.createElem({tag: "div", attr: {class: "entry-body"}});
        bodyBox.appendChild(this._wordBox);
        bodyBox.appendChild(this._choiceBox);
        bodyBox.appendChild(this._resultBox);
        bodyBox.appendChild(this._answerBox);
        this.container.appendChild(this._headerBox);
        this.container.appendChild(bodyBox);
    }
}

mainPage.Quiz.prototype.Entry.prototype.Solution = class {
    /* Creates a partial display of the WordData and provides a method
       to set and check the input of a solution. Parts of WordData with a
       non empty read will be hidden and converted into an input field.
    */
    constructor(wordData) {   
        this.container = this.createElem({tag: "ruby"});
        this.cursor = 0; // Points at the input for this.set()
        
        this._UNSETCLASS = "quiz-hidden-kanji";
        this._UNSETTEXT = ""
        this._sections;
        this._wordData;
        
        this.word = wordData;
    }

    addTo = mainPage.addTo;
    createElem = mainPage.createElem;
    
    // Returns an array of the correct characters to be inputted
    get answers() {
        return this._sections.map( (e) => e.answer );
    }
    
    // Returns an array of the input text or empty string if unset
    get inputs() {
        let inputText = (e) => this._isUnset(e.input) ? "" : e.input.textContent;
        return this._sections.map(inputText);
    }
    
    // Returns the WordData that the solution represents
    get word() {
        return this._wordData;
    }
    
    // Resets and initializes the solution to represent wordData
    set word(wordData) {
        this.container.replaceChildren();
        this.cursor = 0;
        this._sections = [];
        this._wordData = wordData;
        if (!wordData) return;
        for (const part of wordData.parts) {
            if (part.read)
                this._addInput(part.text);
            else
                this._addText(part.text);
            let reading = this.createElem({tag: "rt"});
            reading.textContent = part.read;
            this.container.appendChild(reading);
        }
    }
    
    // Returns an object with an array of the right and wrong inputs
    //     .right contains the input that matched the answers
    //     .wrong contains both the mismatched input and the answer
    check() {
        let results = {right: [], wrong: []};
        for (const sect of this._sections) {
            if (this._isUnset(sect.input)) continue;
            let user = sect.input.textContent;
            if (user == sect.answer)
                results.right.push(user);
            else
                results.wrong.push(user, sect.answer);
        }
        return results;
    }
    
    // Returns true if every input has been set else false
    // Returns true if there are no input elements
    hasAllSet() {
        for (const sect of this._sections)
            if (this._isUnset(sect.input)) return false;
        return true;
    }
    
    // Wraps incorrect user inputs inside a <strong>
    // Will be overwritten if the input is set again
    markIncorrect() {
        for (const sect of this._sections) {
            if (this._isUnset(sect.input)) continue;
            let user = sect.input.textContent;
            if (user != sect.answer) {
                let highlight = this.createElem({tag: "strong"});
                highlight.textContent = user;
                sect.input.replaceChildren(highlight);
            }
        }
    }
    
    // Selects the next input for this.set wrapping back to the first input
    moveCursor() {
        if(this._sections.length == 0) return;
        this.cursor = (this.cursor + 1) % this._sections.length;
    }
    
    // Resets the cursor and clears every input
    resetInput() {
        for (const section of this._sections)
            this._resetInput(section.input);
        this.cursor = 0;
    }
    
    // Sets the current input to inputText and moves the cursor to the next one
    // Changes nothing if there are no input elements
    set(inputText) {
        if(this._sections.length == 0) return;
        let selected = this._sections[this.cursor].input;
        if (this.cursor == 0 && !this._isUnset(selected))
            for (let i = 1; i < this._sections.length; i++)
                this._resetInput(this._sections[i].input);
        
        selected.textContent = inputText;
        selected.classList.remove(this._UNSETCLASS);
        this.moveCursor();
    }
    
    // Adds each character in textToHide as an input and hides it
    _addInput(textToHide) {
        for (const character of textToHide) {
            let input = this.createElem({tag: "span"});
            this._resetInput(input);
            this._sections.push({answer: character, input: input});
            this.container.appendChild(input);
        }
    }
    
    // Adds textToDisplay as normal text to be shown
    _addText(textToDisplay) {
        let txt = this.createElem({tag: "span"});
        txt.textContent = textToDisplay;
        this.container.appendChild(txt);
    }
    
    _isUnset(inputElement) {
        return inputElement.classList.contains(this._UNSETCLASS);
    }
    
    // Resets the text and class of inputElement to be unset
    _resetInput(inputElement) {
        inputElement.textContent = this._UNSETTEXT;
        inputElement.classList.add(this._UNSETCLASS);
    }
    
}

mainPage.Shuffler = class {
    /* Shuffles a copy of an array and provides random elements one at a time.
       Best used for obtaining a small subset of random elements from a larger
       array. Performs slower than a normal shuffle, use a simpler
       implementation when performance is critical.
    */
    
    /* Copies iterableObj into an array at this.data shuffled starting at 0
       If copy = false, iterableObj must be array like and will not be copied
       To iterate with more control use this.generator.next()
    */
    constructor(iterableObj, copy=true) {
        this.data = (copy) ? [...iterableObj] : iterableObj;
        this.generator;
        this.reset();
    }
    
    /* Returns an array of the next <length> random elements of this.data
           returns all remaining elements by default or length >= data.length
           returns an empty array if length is <= 0 or no remaining elements
           <length> is a max value the returned array may be smaller
    */
    random(length=null) {
        let shuffled = []
        if (length == null) length = this.data.length;
        for (let i = 0; i < length; i++) {
            let next = this.generator.next();
            if (next.done) break;
            shuffled.push(next.value);
        }
        return shuffled;
    }
    
    // Discard current shuffle process and restart
    //  * this will not unshuffle this.data
    reset() {
        this.generator = this._randomGenerator(this.data);
    }
    
    // Generator for a shuffle function yielding a random shuffled element 
    * _randomGenerator(arrayObj) {
        let length = arrayObj.length;
        for (let i = 0; i < length - 1; i++) {
            const j = Math.floor(Math.random() * (length - i) + i);
            [arrayObj[i], arrayObj[j]] = [arrayObj[j], arrayObj[i]];
            yield arrayObj[i];
        }
        if (length > 0) 
            yield arrayObj[length - 1];
    }
}
