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
        for (const data of words) {
            let entry = new this.Entry(data, 40, this.allKanji());
            entry.addTo(list);
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

    constructor(wordData, choiceNum, choiceSet) {
        this.container = this.createElem("li", "quiz-entry");
        this.userInput; // Solution object
        
        this._choiceBox = this.createElem("div", "entry-choices");
        this._defBox = this.createElem("p", "entry-def");
        this._headerBox = this.createElem("h1", "entry-header");
        this._wordBox = this.createElem("div", "entry-word");
        
        this._arrangeLayout();
        this.word = wordData;
        this.choices = this.randomChoices(choiceNum, choiceSet);
    }
    
    addTo = mainPage.addTo;
    createElem = mainPage.createElem;
    Shuffler = mainPage.Shuffler;
    
    get choices() {
        return Array.from(this._choiceBox.children, (e) => e.textContent);
    }
    
    set choices(arrayOfString) {
        let inputButtonText = (e) => this.userInput.set(e.target.textContent);
        let buttons = this._choiceBox;
        let buttonsToAdd = arrayOfString.length - buttons.children.length;
        if (buttonsToAdd > 0) {
            for (let i = 0; i < buttonsToAdd; i++) {
                let btn = this.createElem("button");
                btn.addEventListener("click", inputButtonText);
                buttons.appendChild(btn);
            }
        } else {
            for (let i = 0; i > buttonsToAdd; i--)
                buttons.lastElementChild.remove();
        }
        
        for (let i = 0; i < buttons.children.length; i++)
            buttons.children[i].textContent = arrayOfString[i];
    }
    
    get definition() {
        return this._defBox.textContent;
    }
    set definition(textContent) {
        this._defBox.textContent = textContent;
    }
    
    get header() {
        return this._headerBox.textContent;
    }
    set header(textContent) {
        this._headerBox.textContent = textContent;
    }
    
    get word() {
        return this._wordData;
    }
    set word(wordData) {
        this._wordData = wordData;
        let notHidden = (part) => {return part.read || part.text};
        this.header = wordData.parts.map(notHidden).join("");
        this.definition = wordData.definition;
        this._wordBox.replaceChildren();
        this.userInput = new this.Solution(wordData);
        this.userInput.addTo(this._wordBox);
    }

    randomChoices(totalNum, choiceSet) {
        let others = new Set(choiceSet);
        let correct = this.word.kanji;
        for (const kanji of correct)
            others.delete(kanji)
        
        let falseNum = totalNum - correct.size;
        let wrong = new this.Shuffler(others).random(falseNum);
        let choices = new this.Shuffler(wrong.concat(...correct));
        return choices.random();
    }
    
    _arrangeLayout() {
        let bodyBox = this.createElem("div", "entry-body");
        let infoBox = this.createElem("div", "entry-info");
        infoBox.appendChild(this._wordBox);
        infoBox.appendChild(this._defBox);
        bodyBox.appendChild(infoBox);
        bodyBox.appendChild(this._choiceBox);
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
        this.UNSETCLASS = "quiz-hidden-kanji";
        this.UNSETTEXT = "〇"
        
        this.sections = [];
        this.container = this.createElem("ruby");
        this.cursor = 0;
        
        for (const part of wordData.parts) {
            if (part.read)
                this.addInput(part.text);
            else 
                this.addText(part.text);
            let reading = this.createElem("rt");
            reading.textContent = part.read;
            this.container.appendChild(reading);
        }
    }

    addTo = mainPage.addTo;
    createElem = mainPage.createElem;
     
    // Adds each character in textToHide as an input and hides it
    addInput(textToHide) {
        for (const character of textToHide) {
            let input = this.createElem("span");
            this.resetInput(input);
            this.sections.push({answer: character, input: input});
            this.container.appendChild(input);
        }
    }
    
    // Adds textToDisplay as normal text to be shown
    addText(textToDisplay) {
        let txt = this.createElem("span");
        txt.textContent = textToDisplay;
        this.container.appendChild(txt);
    }
    
    // Returns an object with an array of the right and wrong inputs
    //     .right contains the input that matched the answers
    //     .wrong contains both the mismatched input and the answer
    check() {
        let results = {right: [], wrong: []};
        for (const sect of this.sections) {
            if (sect.input.classList.contains(this.UNSETCLASS))
                continue;
            let user = sect.input.textContent;
            if (user == sect.answer)
                results.right.push(user);
            else
                results.wrong.push(user, sect.answer);
        }
        return results;
    }
    
    // Returns true if every input has been set else false
    hasAllSet() {
        for (const sect of this.sections)
            if (sect.input.classList.contains(this.UNSETCLASS))
                return false;
        return true;
    }
    
    // Selects the next input for this.set wrapping back to the first input
    moveCursor() {
        if(this.sections.length == 0) return;
        this.cursor = (this.cursor + 1) % this.sections.length;
    }
    
    // Resets the text and class of inputElement to be unset
    resetInput(inputElement) {
        inputElement.textContent = this.UNSETTEXT;
        inputElement.classList.add(this.UNSETCLASS);
    }
    
    // Sets the current input to inputText and moves the cursor to the next one
    set(inputText) {
        let selected = this.sections[this.cursor].input;
        if (this.cursor == 0 && !selected.classList.contains(this.UNSETCLASS))
            for (let i=1; i < this.sections.length; i++)
                this.resetInput(this.sections[i].input);
        
        selected.textContent = inputText;
        selected.classList.remove(this.UNSETCLASS);
        this.moveCursor();
    }
    
}

mainPage.Shuffler = class {
    /* Shuffles a copy of an array and provides random elements one at a time.
       Best used for obtaining a small subset of random elements from a larger
       array. Shuffling an entire array is only recommended on small sizes as
       it performs slower compared to a normal shuffle.
    */
    
    constructor(iterableObj) {
        this.data = [...iterableObj];
        this.generator = undefined;
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
