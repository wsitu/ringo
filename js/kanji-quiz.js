
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
    
}