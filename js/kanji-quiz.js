(()=>{ //======================================================================
//=============================================================================
const ri = ringo;
const settings = ringo.settings.kanjiQuiz;


// Returns an array of random weight shuffled mapObject keys
//     <mapobject> is a Map or object with a [key, value] iterator
//         value is the weight of key and is a real between [10^-4, 10^15]
function weightedShuffle(mapObject) {
    let weightedOrder = x => [x[0], Math.pow(Math.random(), 1/x[1])];
    let shuffled = Array.from(mapObject, weightedOrder);
    shuffled.sort( (a, b) => b[1] - a[1] ); // High to low weightedOrder
    return shuffled.map(x => x[0]);
    
// Efraimidis & Spirakis: Weighted random sampling with a reservoir (2006)
// Probablity of random_1^(1 / weight_1) >= random_2^(1 / weight_2) is
// equal to weight_1 / (weight_1 + weight_2) so applying this function to
// every weight and sorting it descending produces a permutation of the
// keys without calculating the total weight.
// 
// If slow use resevoir version that doesn't need to sort.
// 
// If wider range of input is needed, use ln(random)/weight instead, seen
// in the blog post by Tim Vieira "Gumbel-max trick and weighted reservoir
// sampling (2014)." Would allow weights around [10^-300, 10^300].
}


ri.Quiz = class extends ri.WElement {
    // Creates a quiz for users to interact with from the dictionaries of words
    // in the DataManager class passed in. Records the accuracy of each kanji
    // based of the correctness of the user input and assigns a larger weight
    // to lower accuracy kanjis for future word selection.
    // 
    // accChance    | [0, 1] chance that words are picked by kanji accuracy
    // choiceRange  | object with {div: , min: , max: } where # of choices is
    //              | floor(<score>/<div>) + <min> capped at <max>
    // entries      | array of current Entry that users can input to
    // entryRange   | same as choiceRange but for the # of entries
    
    // TODO: If more functionality needs to be added refactor first. Maybe pull
    // out word and dictionary related functions from here and DataManager into
    // a class for a collection of dictionaries.
    constructor(dataManager) {
        super(settings.quiz.html.root);
        this.accChance    = this.settings.js.weightedWordRatio;
        this.choiceRange  = this.settings.js.entryChoices;
        this.dataManager  = dataManager;
        this.dictionaries = this.dataManager.dictionaries;
        this.entries      = [];
        this.entryRange   = this.settings.js.entries;

        this._accuracies = this.dataManager.user.accuracies;
        this._difficulty = new this.UpdateSlider();
        this._kanjiCache; // reuse same copy of all kanjis per restart
        this._ACCMORECLASS = this.settings.js.accToggleClass;
        this._ACCNONECLASS = this.settings.js.accNoneClass;
        this._ACCVARIABLE = this.settings.js.accuracyCSSVariable;
        
        this._accBody    = this.createEl(this.settings.html.accBody);
        this._accBox     = this.createEl(this.settings.html.accBox);
        this._accMoreBtn = this.createEl(this.settings.html.accMoreBtn);
        this._beginBtn   = this.createEl(this.settings.html.beginBtn);
        this._entriesBox = this.createEl(this.settings.html.entries);
        this._intro      = this.createEl(this.settings.html.wordsBox);
        this._introBox   = this.createEl(this.settings.html.intro);
        this._mainBox    = this.createEl(this.settings.html.body);
        this._submitBtn  = this.createEl(this.settings.html.submitBtn);

        this._init();
    }
    
    settings = settings.quiz;
    
    get entryCount() {
        return this._numFromScore(this.settings.js.entries);
    }
    
    // The number of buttons per entry
    get choiceCount() {
        return this._numFromScore(this.settings.js.entryChoices);
    }
    
    // Determines the quiz difficulty
    get score() {
        let stored = this.dataManager.user.config.get("score");
        return stored == undefined ? 0 : stored;
    }
    
    set score(intNum) {
        this.dataManager.user.config.set("score", intNum);
    }
    
    // Returns a weight between [1, 3 000 000 000] when
    // 1 <= acc.total <= 1 000 000 000  and 0 <= acc.right <= acc.total
    // A low total or accuracy.ratio results in a higher weight
    accuracyWeight(acc) {
        let weight = acc.ratioWrong * acc.ratioWrong + 0.5/acc.total;
        return weight * 2000000000; // reduce precision error when using it
    }
    
    allKanji() {
        let total = new Set();
        for (const dict of this.dictionaries)
            dict.allKanji.forEach( (kanji) => total.add(kanji) );
        return total;
    }
    
    // Creates new entries with random choices, overwrites previous entries
    createEntries(wordDataArray, numberOfChoices) {
        this._entriesBox.replaceChildren();
        this.entries = [];
        let allKanji = new ri.Shuffler(this._kanjiCache);
        for (const data of wordDataArray) {
            let entry = new this.Entry(data);
            entry.addTo(this._entriesBox);
            entry.shuffleInChoices(allKanji.random(numberOfChoices));
            this.entries.push(entry);
            allKanji.reset();
        }
    }
    
    // <dataArray> array of objects with kanji:string and acc : Accuracy
    displayAccuracy(dataArray = []) {
        this._accBody.replaceChildren();
        let wrapper;
        for (const data of dataArray) {
            wrapper = this.createEl(this.settings.html.accEntry);
            let kanji = this.createEl(this.settings.html.accText);
            kanji.textContent = data.kanji;
            let acc = this.createEl(this.settings.html.accVal);
            let percent = "0%";
            if (data.acc < 0) {
                acc.classList.add(this._ACCNONECLASS);
                acc.textContent = "--%";
            } else {
                percent = `${Math.round(data.acc*100)}%`;
                acc.textContent = percent;
            }
            acc.style.setProperty("--accuracy", percent);
            wrapper.appendChild(kanji);
            wrapper.appendChild(acc);
            this._accBody.appendChild(wrapper);
        }
        // Only enable the button if the last accuracy entry is hidden
        // or the button was toggled meaning they cannot be hidden
        let displayValue = (e) => getComputedStyle(e).getPropertyValue("display");
        if (wrapper && displayValue(wrapper) == "none")
            this._accMoreBtn.disabled = false;
        else
            this._accMoreBtn.disabled = true;
        if (this._accBox.classList.contains(this._ACCMORECLASS))
            this._accMoreBtn.disabled = false;
    }
    
    displayIntro(wordDataArray = []) {
        let wordsByAcc = this.wordDataByKanjiAccuracy(wordDataArray);
        this.displayAccuracy(wordsByAcc);
        this.displayWords(wordsByAcc);
    }
    
    // <dataArray> array of objects with words: [WordData]
    displayWords(dataArray = []) {
        let newDisplayElement = (wordData) => {
            let display = this.createEl(this.settings.html.word);
            let wordText = this.createEl(this.settings.html.wordText);
            let wordDef = this.createEl(this.settings.html.wordDef);
            wordText.innerHTML = wordData.toHTML();
            wordDef.textContent = wordData.definition;
            display.appendChild(wordText);
            display.appendChild(wordDef);
            return display;
        }
        let words = this.createEl(this.settings.html.wordsBody);
        for (const data of dataArray)
            data.words.forEach( e => words.appendChild(newDisplayElement(e)) )
        this._intro.replaceChildren(words);
    }
    
    // Returns the accuracy of <kanjiString> as a ratio or -1 if no data
    getAccuracy(kanjiString) {
        let acc = this._accuracies.get(kanjiString);
        return acc == undefined ? -1 : acc.ratio;
    }
    
    // Returns an array of WordData from a mix of weighted and randomed kanji
    // <numberOfWords> max number of words in the return
    // <weightedChance> [0, 1.0] chance that a word comes from weighted shuffle
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
    
    noAccKanji() {
        let noAcc = new Set();
        for (const kanji of this._kanjiCache) {
            if (this._accuracies.has(kanji)) {
                if (this._accuracies.get(kanji).total == 0)
                    noAcc.add(kanji);
            } else
                noAcc.add(kanji);
        }
        return noAcc;
    }
    
    // Returns an object of the entry results as { <aKanji>: Accuracy }
    // The result of incomplete entries are ignored
    processEntries() {
        let accuracies = {};
        let addAcc = function (key, right, total) {
            if (key in accuracies)
                accuracies[key].add([right, total]);
            else
                accuracies[key] = new ri.Accuracy([right, total]);
        }
        for (const entry of this.entries) {
            if (!entry.userInput.hasAllSet()) continue;
            let result = entry.userInput.check();
            result.right.forEach( (kanji) => addAcc(kanji, 1, 1) );
            result.wrong.forEach( (kanji) => addAcc(kanji, 0, 1) );
        }
        return accuracies;
    }
    
    // Returns an array of all WordData with the kanji in random order
    // <kanjiString> only returns WordDatas whose .kanji contains this string
    // <maxLength> the max number of words in the return
    // <filters> array of Map(keys) or Set(values) of WordData.text to exclude
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
        let shuffler = new ri.Shuffler(Array.from(data.values()), false);
        return shuffler.random(maxLength);
    }
    
    // Returns a map of WordData.text : WordData randomly from kanji with no
    // accuracy data and when exhausted, randomly from all kanji
    // <maxLength> the max number of words in the return
    // <filters> array of Map(keys) or Set(values) of WordData.text to exclude
    randomWords(maxLength, filters = []) {
        let words = new Map();
        let blacklists = filters.concat(words);
        let noData = new ri.Shuffler(this.noAccKanji());
        let randomed = new ri.Shuffler(this._kanjiCache);
        while (words.size < maxLength) {
            let nextKanji = noData.random(1);
            if (nextKanji.length < 1)
                nextKanji = randomed.random(1);
            if (nextKanji.length < 1) break;
            let wordDatas = this.shuffledWordData(nextKanji[0], 1, blacklists)
            wordDatas.forEach( (wdData) => words.set(wdData.text, wdData) );
        }
        return words;
    }
    
    // Restarts the quiz with new words
    restart() {
        let highestScoreNeeded = () => {
            let highest = (rangeObj) => (rangeObj.max - rangeObj.min) * rangeObj.div;
            return Math.max(highest(this.choiceRange), highest(this.entryRange));
        }
        // delayed or you can see the new words while fading out
        let delayedSetup = () => {
            ri.fadeIn(this._introBox);
            this.createEntries(chosenWords, this.choiceCount);
            this._beginBtn.disabled = false;
        }

        this._kanjiCache = this.allKanji();
        this._difficulty.slider.max = highestScoreNeeded();
        this._difficulty.slider.value = this.score;
        let chosenWords = this._wordSetup();
        ri.fadeOut(this._mainBox, delayedSetup);
    }
    
    // Saves accuracy data to user storage
    // <accData> object similar to the return of processEntries()
    saveAccuracy(accData) {
        for (const [kanji, acc] of Object.entries(accData)) {
            if (!this._accuracies.has(kanji))
                this._accuracies.set(kanji, new ri.Accuracy());
            let storedAcc = this._accuracies.get(kanji);
            storedAcc.add(acc);
            try {
                this.dataManager.saveUserAcc(kanji, storedAcc);
            } catch (err) {
                // silently fail for now until we can inform users of the error
                if (!(err instanceof ri.DataManagerError))
                    throw err;
            }
        } 
    }
    
    // Saves data to user storage that is not accuracies
    saveConfig() {
        try {
            this.dataManager.saveUserConfig("score", this.score);
        } catch (err) {
            if (err instanceof ri.DataManagerError)
                return;
            throw err;
        }
    }
    
    // Returns a map of WordData.text : WordData randomly from kanjis by weight
    // <maxLength> the max number of words in the return
    // <filters> array of Map(keys) or Set(values) of WordData.text to exclude
    weightedWords(maxLength, filters = []) {
        let words = new Map();
        let weightedKanji = [];
        if (maxLength > 0) {
            let weights = new Map();
            for (const [key, data] of this._accuracies)
                weights.set(key, this.accuracyWeight(data));
            weightedKanji = weightedShuffle(weights);
        }
        let blacklists = filters.concat(words);
        for (let i = 0; i < weightedKanji.length; i++) {
            if (words.size >= maxLength) break;
            let wordDatas = this.shuffledWordData(weightedKanji[i], 1, blacklists);
            wordDatas.forEach( (wdData) => words.set(wdData.text, wdData) );
        }
        return words;
    }
    
    // Returns an array of {acc: number, kanji: aKanji, words: [wordData]} with
    // kanji sorted ascending by its accuracy. Each WordData is placed in its
    // kanji with the lowest accuracy. No accuracy found is interpreted as -1.
    wordDataByKanjiAccuracy(wordDataArray = []) {
        let withAcc = new Map();
        for (const data of wordDataArray) {
            let lowestAcc = Infinity;
            let lowestKanji;
            for (const kanji of data.kanji) {
                let acc = this.getAccuracy(kanji);
                if (!withAcc.has(kanji))
                    withAcc.set(kanji, {acc: acc, kanji: kanji, words: []});
                if (acc < lowestAcc)
                    [lowestAcc, lowestKanji] = [acc, kanji];
            }
            if (lowestKanji)
                withAcc.get(lowestKanji).words.push(data);
        }
        let ascendingAcc = (a, b) => a.acc - b.acc;
        return Array.from(withAcc.values()).sort(ascendingAcc);
    }
    
    _arrangeLayout() {
        this.addChild(this._introBox);
        this.addChild(this._mainBox);
        this._difficulty.addTo(this._introBox);
        this._introBox.appendChild(this._intro);
        this._introBox.appendChild(this._accBox);
        this._introBox.appendChild(this._beginBtn);
        this._accBox.appendChild(this._accBody);
        this._accBox.appendChild(this._accMoreBtn);
        this._mainBox.appendChild(this._entriesBox);
        this._mainBox.appendChild(this._submitBtn);
    }
    
    _init() {
        this._accBox.addEventListener("click", () => {
            if (this._accMoreBtn.disabled == true) return;
            if (getSelection().toString() != "") return;
            this._accBox.classList.toggle(this._ACCMORECLASS);
        });
        this._beginBtn.addEventListener("click", () => this._startQuiz());
        this._beginBtn.disabled = true;
        this._submitBtn.addEventListener("click", () => this._submitQuiz());
        this._difficulty.throttled = (e) => this._refreshIntro(e);
        this._arrangeLayout();
        this.restart();
    }
    
    // Returns the number based on score clamped to the min and max
    _numFromScore(rangeObj) {
        let num = Math.floor(this.score/rangeObj.div) + rangeObj.min;
        return Math.min(rangeObj.max, Math.max(rangeObj.min, num));
    }
    
    // Used by slider to update the intro with new words
    _refreshIntro(e) {
        this.score = e.target.value;
        this.createEntries(this._wordSetup(), this.choiceCount);
        let numberOfChoices = this._numFromScore(this.choiceRange);
        let slider = this._difficulty;
        slider.display.replaceChildren();
        for (let i = 0; i < numberOfChoices; i++) {
            let item = this.createEl(slider.settings.html.displayItem);
            slider.display.appendChild(item);
        }
    }
    
    _startQuiz() {
        this._beginBtn.disabled = true;
        this._submitBtn.disabled = false;
        ri.fadeOut(this._introBox, () => ri.fadeIn(this._mainBox) );
    }
    
    // Processes the quiz if all entries are complete then restarts
    _submitQuiz() {
        for (const entry of this.entries) {
            if (!entry.userInput.hasAllSet()) {
                entry.highlight();
                return;
            }
        }
        this._submitBtn.disabled = true; // prevent multiple submissions
        let result = this.processEntries();
        this.saveAccuracy(result);
        let isCorrect = (acc) => acc.right >= acc.total;
        if (Object.values(result).every(isCorrect))
            this.score++;
        this.saveConfig();
        this.restart();
    }
    
    // shared code in restart() and _refreshIntro()
    _wordSetup() {
        let chosenWords = this.newWords(this.entryCount, this.accChance);
        this.displayIntro(chosenWords);
        return new ri.Shuffler(chosenWords).random();
    }
}

ri.Quiz.prototype.Entry = class extends ri.WElement {
    // Creates a quiz entry to manage the display and interaction of each
    // WordData to be quized on.
    constructor(wordData) {
        super(settings.entry.html.root);
        this.userInput = new this.Solution();
        
        this._isLocked = false;
        this._wordData;
        
        this._answerBox = this.createEl(this.settings.html.answer);
        this._answerBtn = this.createEl(this.settings.html.answerBtn);
        this._body      = this.createEl(this.settings.html.body);
        this._choices   = this.createEl(this.settings.html.choices);
        this._defBox    = this.createEl(this.settings.html.definition);
        this._uiBox     = this.createEl(this.settings.html.ui);
        this._word      = this.createEl(this.settings.html.word);
        this._wordBox   = this.createEl(this.settings.html.wordBox);
        this._wordData  = this.createEl(this.settings.html.wordData);
        
        this._ANSWERATTR = this.settings.js.answerDataAttr;
        this._BTNCLASS = this.settings.html.choiceBtn.attr.class.split(" ").pop()
        this._CORRECTATTR = this.settings.js.correctDataAttr;
        this._CORRECTCLASS = this.settings.js.correctClass;
        this._HIGHLIGHTCLASS = this.settings.js.hightlightClass;
        this._INCORRECTCLASS = this.settings.js.incorrectClass;

        this._init(wordData);
    }
    
    settings = settings.entry;

    // Returns an array of html elements
    get buttons() {
        return Array.from(this._choices.children, (e) => e.children[0]);
    }
    
    // Returns an array containing the string of each choice
    get choices() {
        let getButtonText = (e) => e.children[0].textContent;
        return Array.from(this._choices.children, getButtonText);
    }
    
    // Sets each button's text to each element in arrayOfString
    // Will add or remove buttons to match the size of the array
    set choices(arrayOfString) {
        let buttons = this._choices;
        let buttonsToAdd = arrayOfString.length - buttons.children.length;
        let newButton = () => {
            let box = this.createEl(this.settings.html.choice);
            box.appendChild(this.createEl(this.settings.html.choiceBtn));
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
    
    get definition() {
        return this._defBox.textContent;
    }
    
    set definition(textContent) {
        this._defBox.textContent = textContent;
    }
    
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
            ri.fadeIn(this._answerBtn);
        } else {
            this.userInput.resetInput();
            this.hideAnswer();
            this.unmarkChoices();
            this.buttons.forEach( (e) => e.disabled=false );
            ri.fadeOut(this._answerBtn, null, 0);
        }
    }
    
    get word() {
        return this._wordData;
    }
    
    set word(wordData) {
        this._wordData = wordData;
        if (!wordData) return;
        this.definition = wordData.definition;
        this.userInput.word = wordData;
        this.shuffleInChoices();
    }

    displayAnswer() {
        this._answerBox.innerHTML = this.word.toHTML();
        let showAnswer = () => {
            ri.fadeIn(this._answerBox);
            ri.fadeOut(this._answerBtn);
        }
        ri.fadeOut(this._word, showAnswer);
    }
    
    hideAnswer() {
        let showInput = () => {
            ri.fadeIn(this._word);
            this._answerBox.replaceChildren();
        }
        ri.fadeOut(this._answerBox, showInput);
    }
    
    highlight() {
        this.root.classList.add(this._HIGHLIGHTCLASS);
        this.root.scrollIntoView();
    }

    // Marks each choice button with data attributes describing whether the 
    // button is an answer (true), if it was pressed (has correct), and whether
    // the button was pressed in the right order (correct = true).
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

    // Sets up the buttons by shuffling this word's kanji with arrayOfString
    // The number of choices will be the same length as the array except when
    // the word has more kanji than the array, making choices of only answers.
    shuffleInChoices(arrayOfString=this.choices) {
        let targetLength = arrayOfString.length;
        let shuffle = new ri.Shuffler(arrayOfString);
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
        this.choices = new ri.Shuffler(inserted).random();
    }
    
    // Toggles the correct / incorrect mark on the entry
    toggleStatus() {
        let classList = this.root.classList;
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
    
    unhighlight() {
        this.root.classList.remove(this._HIGHLIGHTCLASS);
    }
    
    unmarkChoices() {
        for (const btn of this.buttons) {
            delete btn.dataset[this._ANSWERATTR];
            delete btn.dataset[this._CORRECTATTR];
        }
    }
    
    _arrangeLayout() {
        this.addChild(this._body);
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
    
    // On button parent, always ensure this filters to just the buttons
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

ri.Quiz.prototype.Entry.prototype.Solution = class extends ri.WElement {
    // Creates a solution for the entry from the WordData hiding its kanji,
    // accepting input for the answer, and checking its correctness.
    constructor(wordData) {   
        super(settings.solution.html.root);
        this.cursor = 0; // Points at the input for this.set()
        
        this._UNSETCLASS = this.settings.js.unsetClass;
        this._UNSETTEXT = "";
        this._sections;
        this._wordData;
        
        this.word = wordData;
    }

    settings = settings.solution;
    
    // Returns an array of answers in same order as inputs
    get answers() {
        return this._sections.map( (e) => e.answer );
    }
    
    // Returns an array of the input text or empty string if unset
    get inputs() {
        let inputText = (e) => this._isUnset(e.input) ? "" : e.input.textContent;
        return this._sections.map(inputText);
    }
    
    get word() {
        return this._wordData;
    }
    
    // Setting a WordData clears all input
    set word(wordData) {
        this.root.replaceChildren();
        this.cursor = 0;
        this._sections = [];
        this._wordData = wordData;
        if (!wordData) return;
        for (const part of wordData.parts) {
            if (part.read)
                this._addInput(part.text);
            else
                this._addText(part.text);
            let reading = this.createEl(this.settings.html.reading);
            reading.textContent = part.read;
            this.root.appendChild(reading);
        }
    }
    
    // Returns the correctness as an object with two arrays:
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
    
    // Returns true if has every input is set or there are no inputs
    hasAllSet() {
        for (const sect of this._sections)
            if (this._isUnset(sect.input)) return false;
        return true;
    }
    
    // Mark is removed if the marked input is set again
    markIncorrect() {
        for (const sect of this._sections) {
            if (this._isUnset(sect.input)) continue;
            let user = sect.input.textContent;
            if (user != sect.answer) {
                let highlight = this.createEl(this.settings.html.marked);
                highlight.textContent = user;
                sect.input.replaceChildren(highlight);
            }
        }
    }
    
    moveCursor() {
        if (this._sections.length == 0) return; // prevent divide by 0
        this.cursor = (this.cursor + 1) % this._sections.length;
    }
    
    resetInput() {
        for (const section of this._sections)
            this._resetInput(section.input);
        this.cursor = 0;
    }
    
    // Sets inputText and moves cursor, clears inputs if cursor wraps to start
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
    
    // Adds input sections, converting textToHide as answers to be input
    _addInput(textToHide) {
        for (const character of textToHide) {
            let input = this.createEl(this.settings.html.input);
            this._resetInput(input);
            this._sections.push({answer: character, input: input});
            this.root.appendChild(input);
        }
    }
    
    // Adds normal text to be displayed, not input
    _addText(textToDisplay) {
        let txt = this.createEl(this.settings.html.text);
        txt.textContent = textToDisplay;
        this.root.appendChild(txt);
    }
    
    _isUnset(inputElement) {
        return inputElement.classList.contains(this._UNSETCLASS);
    }
    
    _resetInput(inputElement) {
        inputElement.textContent = this._UNSETTEXT;
        inputElement.classList.add(this._UNSETCLASS);
    }
    
}

ri.Quiz.prototype.UpdateSlider = class extends ri.WElement {
    constructor() {
        super(settings.updateSlider.html.root);
        this.callback = function () {};
        this.delay = 0.25;
        this.display = this.createEl(this.settings.html.display);
        this.slider = this.createEl(this.settings.html.slider);
        this.throttled = function () {};

        this._currentCall = undefined;
        this._handleInput = (e) => {
            this.callback(e);
            this.throttledUpdate(e);
        }

        this.addChild(this.slider);
        this.addChild(this.display);
        this.slider.addEventListener("input", this._handleInput);
    }
    
    settings = settings.updateSlider;
    
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

ri.Shuffler = class {
    // Copies the input and provides shuffled subsets of its elements
    //  * If <copy> = false, will not copy the input
    //  * Slower than a simple shuffle when shuffling all elements
    constructor(iterableObj, copy=true) {
        this.data = (copy) ? [...iterableObj] : iterableObj;
        this.generator;
        this.reset();
    }
    
    // Returns an array up to <length> max remaining elements, default is all
    // Returns an empty array if <length> <=0 or no remaining elements
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
    
    // Resets all elements to unshuffled, it does not unshuffle this.data
    reset() {
        this.generator = this._randomGenerator(this.data);
    }
    
    // Generator function for shuffling a single element at a time
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


//=============================================================================
})(); //=======================================================================