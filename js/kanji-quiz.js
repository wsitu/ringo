
class KanjiQuiz {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.container = document.createElement("div"); 
        this.entries = 4;
        this.dictionaries = this.dataManager.dictionaries;
        
        this.createEntries();
    }
    
    createEntries() {
        let list = this.createElem("ul"); 
        let words = this.randomed();
        for (const data of words) {
            let entry = this.createElem("li");
            entry.innerHTML = `${data.text} - ${data.definition}`;
            entry.innerHTML += ` [${this.randomChoices(10, data.kanji)}]`;
            list.appendChild(entry);
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
