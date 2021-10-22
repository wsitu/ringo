
class KanjiQuiz {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.container = document.createElement("div"); 
        this.entries = 4;
        this.dictionaries = this.dataManager.dictionaries;
        
        this.createEntries();
    }
    
    addTo(parentElement) {
        parentElement.appendChild(this.container);
    }
    
    createEntries() {
        let list = this.createElem("ul", "quiz"); 
        let words = this.randomed();
        for (const data of words) {
            let entry = this.createElem("li", "quiz-entry");
            entry.appendChild(this.createHeader(data));
            let bodyBox = this.createElem("div", "entry-body");
            let infoBox = this.createElem("div", "entry-info");
            infoBox.appendChild(this.createWord(data));
            infoBox.appendChild(this.createDefinition(data));
            bodyBox.appendChild(infoBox);
            bodyBox.appendChild(this.createChoices(data));
            entry.appendChild(bodyBox);
            list.appendChild(entry);
        }
        this.container.appendChild(list);
    }
    
    createHeader(wordData) {
        let header = this.createElem("h1", "entry-header");
        let read = wordData.parts.map(part => {return part.read || part.text});
        header.textContent = read.join("");
        return header;
    }
    
    createWord(wordData) {
        let wordBox = this.createElem("div", "entry-word");
        let word = this.createElem("ruby");
        for (const part of wordData.parts) {
            if (part.read) {
                let txt = this.createElem("span", "quiz-hidden-kanji");
                txt.textContent = "〇".repeat(part.text.length);
                word.appendChild(txt);
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
        for (const choice of choices) {
            let btn = this.createElem("button");
            btn.textContent = choice;
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
 
    // Randomly shuffles array and optionally cuts the array to length num
    //    If num <= 0 then all contents of array will be deleted
    //    If num >= array.length nothing will be cut from the array
    // Returns the modified array for convencience
    shuffle(array, num = Infinity) {
        if (num < 0) num = 0;
        let max = Math.min(num, array.length - 1);
        for (let i = 0; i < max; i++) {
            const j = Math.floor(Math.random() * (array.length - i) + i);
            [array[i], array[j]] = [array[j], array[i]];
        }
        if (num < array.length)
            array.splice(num);
        return array;
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
        
        let random = this.shuffle([...others], totalNum - includeSet.size);
        let choices = random.concat([...includeSet]);
        return this.shuffle(choices);
    }
    
    randomed() {
        let words = this.shuffle([...this.allKanji()], this.entries);
        return words.map( word => this.randomWordData(word) );
    }
    
    createElem(tagString, classString=null, idString="") {
        let e = document.createElement(tagString);
        if (classString) e.classList.add(classString);
        e.id = idString;
        return e;
    }
}
