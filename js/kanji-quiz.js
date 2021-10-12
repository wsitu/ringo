
class KanjiQuiz {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.container = document.createElement("div"); 
        this.entries = 4;
        this.dictionaries = this.dataManager.dictionaries;
        
        this.createEntries();
    }
    
    createEntries() {
        let entry = document.createElement("p"); 
        entry.innerHTML = "entries go here";
        this.container.appendChild(entry);
    }
    
    allKanji() {
        let total = new Set();
        for (const dict of this.dictionaries) {
            for (const kanji of dict.kanjiList)
                total.add(kanji);
        }
        return total;
    }
 
    // Randomly shuffles array and optinally cuts the array to length num
    // Returns the modified array for convencience
    shuffle(array, num = Infinity) {
        let max = Math.min(num, array.length - 1);
        for (let i = 0; i < max; i++) {
            const j = Math.floor(Math.random() * (array.length - i) + i);
            [array[i], array[j]] = [array[j], array[i]];
        }
        console.log(array);
        if (num < array.length)
            array.splice(num);
        return array;
    }
}
