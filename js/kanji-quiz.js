const mainPage = {
    
    // Adds an object with a container HTML element to parentElement
    addTo(parentElement) {
        parentElement.appendChild(this.container);
    },
    
    createElem(tagString, classString=null, idString="") {
        let e = document.createElement(tagString);
        if (classString) e.classList.add(classString);
        e.id = idString;
        return e;
    },
    
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
        elementToRemove.addEventListener("transitionend", () => runOnce.run());
        setTimeout(() => runOnce.run(), totalSeconds*1000);
    },
    
    fadeIn(elementToRestore) {
        elementToRestore.style.removeProperty("display");
        elementToRestore.style.removeProperty("opacity");
        let removeTransition = () => {
            elementToRestore.style.removeProperty("transition");
        }
        elementToRestore.addEventListener("transitionend", removeTransition);
    },
    
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
        this.dataManager = dataManager;
        this.container = document.createElement("div"); 
        this.entries = 4;
        this.dictionaries = this.dataManager.dictionaries;
        this.selections = [];
        
        this.createEntries();
    }
    
    addTo = mainPage.addTo;
    
    createEntries() {
        let list = this.createElem("ul", "quiz"); 
        let words = this.randomed();
        this.selections = [];
        let allKanji = new this.Shuffler(this.allKanji());
        for (const data of words) {
            let entry = new this.Entry(data);
            entry.addTo(list);
            entry.shuffleInChoices(allKanji.random(40));
            allKanji.reset();
        }
        this.container.appendChild(list);
    }

    allKanji() {
        let total = new Set();
        for (const dict of this.dictionaries) {
            for (const kanji of dict.kanjiList)
                total.add(kanji);
        }
        return total;
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
    
    randomed() {
        let words = new this.Shuffler(this.allKanji()).random(this.entries);
        return words.map( word => this.randomWordData(word) );
    }
    
    createElem(tagString, classString=null, idString="") {
        let e = document.createElement(tagString);
        if (classString) e.classList.add(classString);
        e.id = idString;
        return e;
    }
    
    Shuffler = mainPage.Shuffler;
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
        
        this._choiceBox = this.createElem("ul", "entry-choices");
        this._headerBox = this.createElem("h1", "entry-header");
        this._resultBox = this.createElem("p", "entry-result");
        this._wordBox = this.createElem("p", "entry-word");
        
        this._arrangeLayout();
        this.word = wordData;
    }
    
    addTo = mainPage.addTo;
    createElem = mainPage.createElem;
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
    
    get locked() {
        return this._isLocked;
    }
    
    set locked(aBool) {
        if (this._isLocked == aBool) return;
        this._isLocked = aBool;
        if (aBool == true) {
            this.fadeOut(this._choiceBox, () => this.displayResult());
        } else {
            // undo locking
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
        let notHidden = (part) => {return part.read || part.text};
        this.header = wordData.definition;
        this.userInput.word = wordData;
        this.shuffleInChoices();
    }

    displayResult() {
        if (this.userInput.check().wrong.length == 0) {
            this._resultBox.textContent = this._CORRECTTEXT;
        } else {
            let replaceWithAnswer = () => { 
                this.fadeOut(this._resultBox, this.displayAnswer);
            }
            let btn = this.createElem("button");
            btn.textContent = this._INCORRECTTEXT;
            btn.addEventListener("click", replaceWithAnswer);
            this._resultBox.replaceChildren(btn);
        }

    }
    
    displayAnswer() {
        console.log("display answer");
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
        this.userInput.addTo(this._wordBox);
        let bodyBox = this.createElem("div", "entry-body");
        bodyBox.appendChild(this._wordBox);
        bodyBox.appendChild(this._choiceBox);
        bodyBox.appendChild(this._resultBox);
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
        this._UNSETTEXT = "〇"
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
