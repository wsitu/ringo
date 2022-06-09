const kanjiQuiz = {
    
    settings: settings.kanjiQuiz,
    
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

kanjiQuiz.Quiz = class {
    
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
        this.accChance    = this.settings.js.weightedWordRatio;
        this.choiceRange  = this.settings.js.entryChoices;
        this.container    = this.createElem(this.settings.html.container);
        this.dataManager  = dataManager;
        this.dictionaries = this.dataManager.dictionaries;
        this.entries      = [];
        this.entryRange   = this.settings.js.entries;
        this.score        = 0;
        this.tempAccuracy = new Map();

        this._difficulty = new this.UpdateSlider();
        this._kanjiCache; // reuse same copy of all kanjis per restart

        this._beginBtn   = this.createElem(this.settings.html.beginBtn);
        this._entriesBox = this.createElem(this.settings.html.entries);
        this._intro      = this.createElem(this.settings.html.wordsBox);
        this._introBox   = this.createElem(this.settings.html.intro);
        this._mainBox    = this.createElem(this.settings.html.body);
        this._submitBtn  = this.createElem(this.settings.html.submitBtn);
        
        this._init();
    }
    
    addTo = kanjiQuiz.addTo;
    createElem = kanjiQuiz.createElem;
    settings = kanjiQuiz.settings.quiz;
    fadeIn = kanjiQuiz.fadeIn;
    fadeOut = kanjiQuiz.fadeOut;
    weightedShuffle = kanjiQuiz.weightedShuffle;
    Shuffler = kanjiQuiz.Shuffler;
    
    // Returns the number of entries to create based on the score
    get entryCount() {
        return this._numFromScore(this.settings.js.entries);
    }
    
    // Returns the number of entry choices to create based on the score
    get choiceCount() {
        return this._numFromScore(this.settings.js.entryChoices);
    }
    
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
        let words = this.createElem(this.settings.html.wordsBody);
        for (const data of wordDataArray) {
            let row = this.createElem(this.settings.html.word);
            let wordText = this.createElem(this.settings.html.wordText);
            wordText.appendChild(kanjiQuiz.wordDataToRuby(data));
            let wordDef = this.createElem(this.settings.html.wordDef);
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
        let highestScoreNeeded = () => {
            let highest = (rangeObj) => (rangeObj.max - rangeObj.min) * rangeObj.div;
            return Math.max(highest(this.choiceRange), highest(this.entryRange));
        }
        let delayedSetup = () => {
            this.fadeIn(this._introBox);
            // delayed or you can see old words replaced before faded out
            this.createEntries(chosenWords, this.choiceCount);
        }

        this._kanjiCache = this.allKanji();
        this._difficulty.slider.max = highestScoreNeeded();
        this._difficulty.slider.value = this.score;
        let chosenWords = this.newWords(this.entryCount, this.accChance);
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
        this._difficulty.addTo(this._introBox);
        this._introBox.appendChild(this._intro);
        this._introBox.appendChild(this._beginBtn);
        this._mainBox.appendChild(this._entriesBox);
        this._mainBox.appendChild(this._submitBtn);
    }
    
    // One time setup on constructor
    _init() {
        this._beginBtn.addEventListener("click", () => this._startQuiz());
        this._submitBtn.addEventListener("click", () => this._submitQuiz());
        this._difficulty.throttled = (e) => this._refreshIntro(e);
        this._arrangeLayout();
        this.restart();
    }
    
    _numFromScore(rangeObj) {
        let num = Math.floor(this.score/rangeObj.div) + rangeObj.min;
        return Math.min(rangeObj.max, Math.max(rangeObj.min, num));
    }
    
    _refreshIntro(e) {
        this.score = e.target.value;
        let chosenWords = this.newWords(this.entryCount, this.accChance);
        this.displayIntro(chosenWords);
        this.createEntries(chosenWords, this.choiceCount);
        let numberOfChoices = this._numFromScore(this.choiceRange);
        let slider = this._difficulty;
        slider.display.replaceChildren();
        for (let i = 0; i < numberOfChoices; i++) {
            let item = this.createElem(slider.settings.html.displayItem);
            slider.display.appendChild(item);
        }
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
                entry.highlight();
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

kanjiQuiz.Quiz.prototype.Entry = class {
    
    /* Creates an entry to display wordData's information but hides the
       components of the word among other false buttons.
    */
    constructor(wordData) {
        this.container = this.createElem(this.settings.html.container);
        this.userInput = new this.Solution();
        
        this._isLocked = false;
        this._wordData;
        
        this._answerBox = this.createElem(this.settings.html.answer);
        this._answerBtn = this.createElem(this.settings.html.answerBtn);
        this._body      = this.createElem(this.settings.html.body);
        this._choices   = this.createElem(this.settings.html.choices);
        this._defBox    = this.createElem(this.settings.html.definition);
        this._uiBox     = this.createElem(this.settings.html.ui);
        this._word      = this.createElem(this.settings.html.word);
        this._wordBox   = this.createElem(this.settings.html.wordBox);
        this._wordData  = this.createElem(this.settings.html.wordData);
        
        this._ANSWERATTR = this.settings.js.answerDataAttr;
        this._BTNCLASS = this.settings.html.choiceBtn.attr.class.split(" ").pop()
        this._CORRECTATTR = this.settings.js.correctDataAttr;
        this._CORRECTCLASS = this.settings.js.correctClass;
        this._HIGHLIGHTCLASS = this.settings.js.hightlightClass;
        this._INCORRECTCLASS = this.settings.js.incorrectClass;

        this._init(wordData);
    }
    
    addTo = kanjiQuiz.addTo;
    createElem = kanjiQuiz.createElem;
    fadeIn = kanjiQuiz.fadeIn;
    fadeOut = kanjiQuiz.fadeOut;
    settings = kanjiQuiz.settings.entry;
    Shuffler = kanjiQuiz.Shuffler;

    // Returns an array containing the button elements used for choices
    get buttons() {
        return Array.from(this._choices.children, (e) => e.children[0]);
    }
    
    // Returns an array containing the string of each choice
    get choices() {
        let getButtonText = (e) => e.children[0].textContent;
        return Array.from(this._choices.children, getButtonText);
    }
    
    // Sets each button's text in choices to those of arrayOfString
    // Will add or remove buttons to match the size of the array
    set choices(arrayOfString) {
        let buttons = this._choices;
        let buttonsToAdd = arrayOfString.length - buttons.children.length;
        let newButton = () => {
            let box = this.createElem(this.settings.html.choice);
            box.appendChild(this.createElem(this.settings.html.choiceBtn));
            return box;
        }
        if (buttonsToAdd > 0) {
            for (let i = 0; i < buttonsToAdd; i++)
                buttons.appendChild(newButton());
        } else {
            for (let i = 0; i > buttonsToAdd; i--)
                buttons.lastElementChild.remove();
        }
        for (let i = 0; i < buttons.children.length; i++)
            buttons.children[i].children[0].textContent = arrayOfString[i];
    }
    
    // Returns the text of the definition element
    get definition() {
        return this._defBox.textContent;
    }
    
    // Sets the text of the definition element
    set definition(textContent) {
        this._defBox.textContent = textContent;
    }
    
    // Returns whether the user can input to this entry
    get locked() {
        return this._isLocked;
    }
    
    // If true, prevents further user input and shows if the input is correct
    // If false, resets the entry and allows user input again
    set locked(aBool) {
        if (this._isLocked == aBool) return;
        this._isLocked = aBool;
        this.toggleStatus();
        if (aBool == true) {
            this.userInput.markIncorrect();
            this.unhighlight();
            this.markChoices();
            this.buttons.forEach( (e) => e.disabled=true );
            this.fadeIn(this._answerBtn);
        } else {
            this.userInput.resetInput();
            this.hideAnswer();
            this.unmarkChoices();
            this.buttons.forEach( (e) => e.disabled=false );
            this.fadeOut(this._answerBtn, null, 0);
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
        this.definition = wordData.definition;
        this.userInput.word = wordData;
        this.shuffleInChoices();
    }

    // Hides what the user input and displays the correct answer
    displayAnswer() {
        this._answerBox.replaceChildren(kanjiQuiz.wordDataToRuby(this.word));
        let showAnswer = () => {
            this.fadeIn(this._answerBox);
            this.fadeOut(this._answerBtn, null);
        }
        this.fadeOut(this._word, showAnswer);
    }
    
    // Hides the correct answer and displays the user input
    hideAnswer() {
        let showInput = () => {
            this.fadeIn(this._word);
            this._answerBox.replaceChildren();
        }
        this.fadeOut(this._answerBox, showInput);
    }
    
    // Adds a class to indicate the entry requires input and scrolls it into view
    highlight() {
        this.container.classList.add(this._HIGHLIGHTCLASS);
        this.container.scrollIntoView();
    }

    /* Marks each choice button with data attributes describing its status
       answer = "true" if it contains an answer else "false"
       correct has value only if activated and its value is:
           "true" if it is an answer and was input in the right order
           "false" if is not an answer or was input in the wrong order
    */
    markChoices() {
        let answers = new Set(this.userInput.answers);
        let inputs = new Set(this.userInput.inputs);
        let wrongInputs = new Set(this.userInput.check().wrong);
        for (const btn of this.buttons) {
            let choice = btn.textContent;
            if (answers.has(choice))
                btn.dataset[this._ANSWERATTR] = "true";
            else
                btn.dataset[this._ANSWERATTR] = "false";
            delete btn.dataset[this._CORRECTATTR];
            if (inputs.has(choice)) {
                if (wrongInputs.has(choice))
                    btn.dataset[this._CORRECTATTR] = "false";
                else
                    btn.dataset[this._CORRECTATTR] = "true";
            }
        }
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
    
    // Adds or removes classes onto the container element that indicate
    // whether the user answered the entry correctly or not
    toggleStatus() {
        let classList = this.container.classList;
        if (classList.contains(this._CORRECTCLASS) || 
                classList.contains(this._INCORRECTCLASS)) {
            classList.remove(this._CORRECTCLASS);
            classList.remove(this._INCORRECTCLASS);
            return;
        }
        if (this.userInput.check().wrong.length == 0)
            classList.add(this._CORRECTCLASS);
        else
            classList.add(this._INCORRECTCLASS);
    }
    
    // Removes the class added by highlight()
    unhighlight() {
        this.container.classList.remove(this._HIGHLIGHTCLASS);
    }
    
    // Removes the data attributes on choice buttons added by markChoices()
    unmarkChoices() {
        for (const btn of this.buttons) {
            delete btn.dataset[this._ANSWERATTR];
            delete btn.dataset[this._CORRECTATTR];
        }
    }
    
    _arrangeLayout() {
        this.container.appendChild(this._body);
        this._body.appendChild(this._wordData);
        this._body.appendChild(this._uiBox);
        this._wordData.appendChild(this._wordBox);
        this._wordData.appendChild(this._defBox);
        this._wordData.appendChild(this._answerBtn);
        this._wordBox.appendChild(this._word); // allows userInput ruby to wrap
        this._wordBox.appendChild(this._answerBox);
        this.userInput.addTo(this._word);
        this._uiBox.appendChild(this._choices)
    }
    
    // Sets the next input as the button's textContent and locks entry if full
    // Does nothing if already locked or the clicked element is not a choiceBtn
    _handleClick(e) {
        if (!e.target.classList.contains(this._BTNCLASS)) return;
        if (this.locked) return;
        this.userInput.set(e.target.textContent);
        if (this.userInput.hasAllSet()) {
            this.locked = true;
        }
    }

    _init(wordData) {
        this._answerBtn.addEventListener("click", () => this.displayAnswer());
        this._choices.addEventListener("click", (e) => this._handleClick(e));
        this._arrangeLayout();
        this.word = wordData;
    }
}

kanjiQuiz.Quiz.prototype.Entry.prototype.Solution = class {
    /* Creates a partial display of the WordData and provides a method
       to set and check the input of a solution. Parts of WordData with a
       non empty read will be hidden and converted into an input field.
    */
    constructor(wordData) {   
        this.container = this.createElem(this.settings.html.container);
        this.cursor = 0; // Points at the input for this.set()
        
        this._UNSETCLASS = this.settings.js.unsetClass;
        this._UNSETTEXT = "";
        this._sections;
        this._wordData;
        
        this.word = wordData;
    }

    addTo = kanjiQuiz.addTo;
    createElem = kanjiQuiz.createElem;
    settings = kanjiQuiz.settings.solution;
    
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
            let reading = this.createElem(this.settings.html.reading);
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
                let highlight = this.createElem(this.settings.html.marked);
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
            let input = this.createElem(this.settings.html.input);
            this._resetInput(input);
            this._sections.push({answer: character, input: input});
            this.container.appendChild(input);
        }
    }
    
    // Adds textToDisplay as normal text to be shown
    _addText(textToDisplay) {
        let txt = this.createElem(this.settings.html.text);
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

kanjiQuiz.Quiz.prototype.UpdateSlider = class {
    constructor() {
        this.callback = function () {};
        this.container = this.createElem(this.settings.html.container);
        this.delay = 0.25;
        this.display = this.createElem(this.settings.html.display);
        this.slider = this.createElem(this.settings.html.slider);
        this.throttled = function () {};

        this._currentCall = undefined;
        this._handleInput = (e) => {
            this.callback(e);
            this.throttledUpdate(e);
        }

        this.container.appendChild(this.slider);
        this.container.appendChild(this.display);
        this.slider.addEventListener("input", this._handleInput);
    }
    
    addTo = kanjiQuiz.addTo;
    createElem = kanjiQuiz.createElem;
    settings = kanjiQuiz.settings.updateSlider;
    
    throttledUpdate(eventObj) {
        if (this._currentCall == undefined) {
            let executeThrottled = () => {
                this._currentCall = undefined;
                this.throttled(eventObj);
            }
            this._currentCall = setTimeout(executeThrottled, this.delay*1000);
        }
    }
}

kanjiQuiz.Shuffler = class {
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
