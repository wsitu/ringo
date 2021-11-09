const mainPage = {
    
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
    
    addTo(parentElement) {
        parentElement.appendChild(this.container);
    }
    
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
        this.userInput = new this.AnswerHandler(wordData);
        this.word = wordData;

        this.init(choiceNum, choiceSet);
    }
    
    addTo(parentElement) {
        parentElement.appendChild(this.container);
    }
    
    createElem = mainPage.createElem;
    
    createChoices(totalNum, choiceSet) {
        let choiceBox = this.createElem("div", "entry-choices");
        let choices = this.randomChoices(totalNum, choiceSet);
        let inputButtonText = (e) => this.userInput.set(e.target.textContent);
        for (const choice of choices) {
            let btn = this.createElem("button");
            btn.textContent = choice;
            btn.onclick = inputButtonText;
            choiceBox.appendChild(btn);
        }
        return choiceBox;
    }
    
    createDefinition() {
        let defBox = this.createElem("div", "entry-def");
        let def = this.createElem("p");
        def.textContent = this.word.definition;
        defBox.appendChild(def);
        return defBox;
    }
    
    createHeader() {
        let header = this.createElem("h1", "entry-header");
        let notHidden = (part) => {return part.read || part.text};
        header.textContent = this.word.parts.map(notHidden).join("");
        return header;
    }

    init(totalNum, choiceSet) {
        this.container.appendChild(this.createHeader());
        let bodyBox = this.createElem("div", "entry-body");
        let infoBox = this.createElem("div", "entry-info");
        let wordBox = this.createElem("div", "entry-word")
        this.userInput.addTo(wordBox);
        infoBox.appendChild(wordBox);
        infoBox.appendChild(this.createDefinition());
        bodyBox.appendChild(infoBox);
        bodyBox.appendChild(this.createChoices(totalNum, choiceSet));
        this.container.appendChild(bodyBox);
    }

    randomChoices(totalNum, choiceSet) {
        let others = new Set(choiceSet);
        let correct = this.word.kanji;
        for (const kanji in correct)
            others.delete(kanji)
        
        let falseNum = totalNum - correct.size;
        let wrong = new this.Shuffler(others).random(falseNum);
        let choices = new this.Shuffler(wrong.concat(...correct));
        return choices.random();
    }
    
    Shuffler = mainPage.Shuffler;
}

mainPage.Quiz.prototype.Entry.prototype.AnswerHandler = class {
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
    
    addTo(parentElement) {
        parentElement.appendChild(this.container);
    }
    
    createElem = mainPage.createElem;

    moveCursor(index=null) {
        if(this.sections.length == 0) return;
        if(index)
            this.cursor = index;
        else
            this.cursor++;
        this.cursor = this.cursor % this.sections.length;
    }
    
    addInput(textToHide) {
        for (const character of textToHide) {
            let input = this.createElem("span", this.UNSETCLASS);
            input.textContent = this.UNSETTEXT;
            this.sections.push({answer: character, input: input});
            this.container.appendChild(input);
        }
    }
    
    addText(textToDisplay) {
        let txt = this.createElem("span");
        txt.textContent = textToDisplay;
        this.container.appendChild(txt);
    }
    
    set(inputText) {
        let selected = this.sections[this.cursor].input;
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
           returns an empty array if length is <= 0
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
    // or null if arrayObj is an empty array.
    * _randomGenerator(arrayObj) {
        let length = arrayObj.length;
        for (let i = 0; i < length - 1; i++) {
            const j = Math.floor(Math.random() * (length - i) + i);
            [arrayObj[i], arrayObj[j]] = [arrayObj[j], arrayObj[i]];
            yield arrayObj[i];
        }
        if (length > 0) 
            yield arrayObj[length - 1];
        else 
            yield null;
    }
}
