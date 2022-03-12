const settings = {
    kanjiQuiz : {
        quiz: {}
    }
};

settings.kanjiQuiz.quiz.html = {
    beginBtn: {
        tag : "button",
        attr: {class: "quiz-control-button"},
        html: "<ruby>次<rt>Next</rt></ruby>"
    },
    body: {tag : "div", attr: {style: "display: none"}},
    container: {tag : "div", attr: {class: "quiz"}},
    entries: {tag : "ul", attr: {class: "quiz-entries"}},
    intro: {tag : "div", attr: {class: "quiz-intro"}},
    submitBtn: {
        tag : "button",
        attr: {class: "quiz-control-button"},
        html: "<ruby>次<rt>Next</rt></ruby>"
    },
    word: {tag: "tr"},
    wordsBody: {tag: "tbody"},
    wordsBox: {tag: "table"},
    wordDef: {tag: "td"},
    wordText: {tag: "th"}
};

settings.kanjiQuiz.quiz.js = {
    
    // Number of entries in each quiz based on quiz score (times all correct)
    // entry # = floor(<score>/<div>) + <min> capped at <max>
    entries : {div: 4, min: 1, max: 10},
    
    // Same as entries but for the number of entry choices
    entryChoices : {div: 2, min: 8, max: 20},
    
    // Number between 0 and 1 that represents the chance that quiz words are
    // picked by its kanji accuracy (lower accuracy = higher chance)
    weightedWordRatio : 0.75
};