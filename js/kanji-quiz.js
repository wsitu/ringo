const mainPage = {
    
    // Adds an object with a container HTML element to parentElement
    addTo(parentElement) {
        parentElement.appendChild(this.container);
    },
    
    // Returns a tagString element with the remaining args added as classes
    createElem(tagString /*and class strings*/) {
        let e = document.createElement(tagString);
        let classes = Array.prototype.slice.call(arguments, 1);
        if (classes.length > 0) e.classList.add(...classes);
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
    constructor(dataManager) {
        this.container = this.createElem("ul", "quiz"); 
        this.dataManager = dataManager;
        this.dictionaries = this.dataManager.dictionaries;
        this.entries = [];
        this.tempAccuracy = new Map();

        this._entriesBox = this.createElem("ul",  "quiz-entries");
        this._footerBox  = this.createElem("div", "quiz-footer");
        this._introBox   = this.createElem("div", "quiz-intro");
        
        this._submitBtn = this.createElem("button");
        this._submitBtn.innerHTML = "<ruby>次<rt>Next</rt></ruby>";
        
        this.container.appendChild(this._introBox);
        this.container.appendChild(this._entriesBox);
        this.container.appendChild(this._footerBox);
        this._footerBox.appendChild(this._submitBtn);
        
        this.restart(true);
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
    
    // Replaces the current entries with new ones
    createEntries(wordDataArray, numberOfChoices) {
        this._entriesBox.replaceChildren();
        this.entries = [];
        let allKanji = new this.Shuffler(this.allKanji());
        for (const data of wordDataArray) {
            let entry = new this.Entry(data);
            entry.addTo(this._entriesBox);
            entry.shuffleInChoices(allKanji.random(numberOfChoices));
            this.entries.push(entry);
            allKanji.reset();
        }
    }

    allKanji() {
        let total = new Set();
        for (const dict of this.dictionaries) {
            for (const kanji of dict.kanjiList)
                total.add(kanji);
        }
        return total;
    }
    
    displayIntro(wordDataArray = []) {
        let container = this.createElem("table");
        let words = this.createElem("tbody");
        for (const data of wordDataArray) {
            let row = this.createElem("tr");
            let wordText = this.createElem("th");
            wordText.appendChild(mainPage.wordDataToRuby(data));
            let wordDef = this.createElem("td");
            wordDef.textContent = data.definition;
            row.appendChild(wordText);
            row.appendChild(wordDef);
            words.appendChild(row);
        }
        container.appendChild(words);
        this._introBox.replaceChildren(container);
    }
    
    newWords(numberOfWords, weightedChance = 0.90) {
        let numOfWeighted = 0;
        for (let i = 0; i < numberOfWords; i++) {
            if (Math.random() < weightedChance)
                numOfWeighted++;
        }
        let words = new Map();
        let weightedKanji = [];
        if (numOfWeighted > 0) {
            let weights = new Map();
            for (const [key, data] of this.tempAccuracy) 
                weights.set(key, this.accuracyWeight(data.right, data.total));
            weightedKanji = this.weightedShuffle(weights);
        }
        for (let i = 0; i < weightedKanji.length; i++) {
            if (words.size >= numOfWeighted) break;
            let wordData = this.randomWordData(weightedKanji[i])
            words.set(wordData.text, wordData);
        }
        let randomNum = numberOfWords - words.size;
        let randomed = new this.Shuffler(this.allKanji());
        while (words.size < numberOfWords) {
            let nextKanji = randomed.random(1);
            if (nextKanji.length < 1) break;
            let wordData = this.randomWordData(nextKanji[0]);
            words.set(wordData.text, wordData);
        }
        return Array.from(words.values());
    }
    
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
    
    randomWordData(kanjiString) {
        let data = {}
        for (const dict of this.dictionaries) {
            let words = dict.wordsWith(kanjiString);
            for (const word of words)
                data[word] = dict.getData(word);
        }
        let words = Object.keys(data);
        let randomWord = words[Math.floor(Math.random() * words.length)];
        return data[randomWord];
    }
    
    restart(isFirstRestart = false) {
        let setupQuiz = () => {
            let chosenWords = this.newWords(4);
            this.displayIntro(chosenWords);
            this.fadeIn(this._introBox);
            this.createEntries(chosenWords, 40);
            this._submitBtn.onclick = () => this._startQuiz();
        }
        if (isFirstRestart) {
            this._entriesBox.style.display = "none";
            setupQuiz();
        }
        else
            this.fadeOut(this._entriesBox, setupQuiz);
    }
    
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
    
    _startQuiz() {
        let addSubmitEvent = () => {
            this.fadeIn(this._entriesBox);
            this._submitBtn.onclick = () => this._submitQuiz();
        }
        this._submitBtn.onclick = undefined;
        this.fadeOut(this._introBox, addSubmitEvent);
    }
    
    _submitQuiz() {
        for (const entry of this.entries) {
            if (!entry.userInput.hasAllSet()) {
                // add visual
                let headers = entry.container.getElementsByTagName("h2");
                if (headers.length > 0) headers[0].scrollIntoView();
                return;
            }
        }
        this._submitBtn.onclick = undefined;
        this.saveAccuracy(this.processEntries());
        this.restart();
    }
}

mainPage.Quiz.prototype.Entry = class {
    
    /* Creates an entry to display wordData's information but hides the
       components of the word among other false buttons.
    */
    constructor(wordData) {
        this.container = this.createElem("li", "quiz-entry");
        this.userInput = new this.Solution();
        
        this._CORRECTTEXT = "\u2714"; //check mark
        this._INCORRECTTEXT = "\u2716"; //X mark
        this._isLocked = false;
        this._wordData;
        
        this._answerBox = this.createElem("p",   "entry-answer");
        this._choiceBox = this.createElem("ul",  "entry-choices");
        this._headerBox = this.createElem("h2",  "entry-header");
        this._resultBox = this.createElem("p",   "entry-result");
        this._wordBox   = this.createElem("div", "entry-word");
        
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
                let listElement = this.createElem("li");
                let btn = this.createElem("button");
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
            let btn = this.createElem("button");
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
        let wordContainer = this.createElem("p");
        this._wordBox.appendChild(wordContainer);
        
        this.userInput.addTo(wordContainer);
        let bodyBox = this.createElem("div", "entry-body");
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
        this.container = this.createElem("ruby");
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
            let reading = this.createElem("rt");
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
                let highlight = this.createElem("strong");
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
            let input = this.createElem("span");
            this._resetInput(input);
            this._sections.push({answer: character, input: input});
            this.container.appendChild(input);
        }
    }
    
    // Adds textToDisplay as normal text to be shown
    _addText(textToDisplay) {
        let txt = this.createElem("span");
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
