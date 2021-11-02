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
            let entry = new this.Entry(data);
            entry.addTo(list);
            /*
            let bodyBox = this.createElem("div", "entry-body");
            let infoBox = this.createElem("div", "entry-info");
            infoBox.appendChild(this.createWord(data));
            infoBox.appendChild(this.createDefinition(data));
            bodyBox.appendChild(infoBox);
            bodyBox.appendChild(this.createChoices(data));
            entry.appendChild(bodyBox);
            list.appendChild(entry);
            */
        }
        this.container.appendChild(list);
    }
    
    createWord(wordData) {
        let wordBox = this.createElem("div", "entry-word");
        let word = this.createElem("ruby");
        let selectData = {input:[], pointer: 0};
        this.selections.push(selectData);
        for (const part of wordData.parts) {
            if (part.read) {
                for (const character of part.text) {
                    let txt = this.createElem("span", "quiz-hidden-kanji");
                    txt.textContent = "〇";
                    word.appendChild(txt);
                    selectData.input.push(txt);
                }
            } else {
                let txt = this.createElem("span");
                txt.textContent = part.text;
                word.appendChild(txt);
            }
            let read = this.createElem("rt");
            read.textContent = part.read;
            word.appendChild(read);
        }
        wordBox.appendChild(word);
        return wordBox;
    }
    
    createDefinition(wordData) {
        let defBox = this.createElem("div", "entry-def");
        let def = this.createElem("p");
        def.textContent = wordData.definition;
        defBox.appendChild(def);
        return defBox;
    }
    
    createChoices(wordData) {
        let choiceBox = this.createElem("div", "entry-choices");
        let choices = this.randomChoices(40, wordData.kanji);
        let currSelect = this.selections[this.selections.length -1 ];
        for (const choice of choices) {
            let btn = this.createElem("button");
            btn.textContent = choice;
            btn.onclick = (e) => {
                currSelect.input[currSelect.pointer].innerText = e.target.innerText;
                currSelect.pointer = (currSelect.pointer + 1) % currSelect.input.length;
            };
            choiceBox.appendChild(btn);
        }
        return choiceBox;
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
    
    randomChoices(totalNum, includeSet=new Set()) {
        let others = this.allKanji();
        for (const kanji in includeSet)
            others.delete(kanji)
        
        let falseNum = totalNum - includeSet.size;
        let wrong = new this.Shuffler(others).random(falseNum);
        let choices = new this.Shuffler(wrong.concat(...includeSet));
        return choices.random();
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
    
    constructor(wordData) {
        this.container = this.createElem("li", "quiz-entry");
        this.header;
        this.selections;
        this.word = wordData;

        
        this.createHeader();
    }
    
    addTo(parentElement) {
        parentElement.appendChild(this.container);
    }
    
    createElem = mainPage.createElem;
    
    createHeader() {
        this.header = this.createElem("h1", "entry-header");
        let notHidden = (part) => {return part.read || part.text};
        this.header.textContent = this.word.parts.map(notHidden).join("");
        this.container.appendChild(this.header);
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
