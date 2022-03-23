const settings = {
    kanjiQuiz : {
        entry: {},
        quiz: {},
        solution: {},
    }
};

settings.kanjiQuiz.quiz.html = {
    beginBtn: {
        tag : "button",
        attr: {
            class: "quiz-control-button a-background-bg0 a-color-fg1 " +
            "b-hover-invert",
            type: "button",
        },
        html: "<ruby>次<rt>Next</rt></ruby>"
    },
    body: {tag : "div", attr: {style: "display: none"}},
    container: {tag : "div", attr: {class: "quiz"}},
    entries: {tag : "ul", attr: {class: "quiz-entries"}},
    intro: {tag : "div", attr: {class: "quiz-intro"}},
    submitBtn: {
        tag : "button",
        attr: {
            class: "quiz-control-button a-background-bg0 a-color-fg1 " +
            "b-hover-invert",
            type: "button",
        },
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

settings.kanjiQuiz.entry.html = {
    answer: {
        tag : "p",
        attr: {
            class: "entry-answer a-color-fg1",
            style: "display: none",
        },
    },
    body: {tag: "div", attr: {class: "entry-body"}},
    choice: {tag: "li", attr: {class: "quiz-entry"}},
    choices: {tag: "ul",  attr: {class: "entry-choices"}},
    choiceBtn: {
        tag : "button",
        attr: {
            class: "a-background-bg0 a-color-fg2 b-hover-invert",
            type: "button",
        },
    },
    correct: {
        tag : "span",
        attr: {style: "display: none"},
        text: "\u2714", //check mark
    },
    container: {tag: "li", attr: {class: "quiz-entry"}},
    header: {tag: "h2",  attr: {class: "entry-header"}},
    incorrect: {
        tag : "button",
        attr: {
            class: "a-background-bg0 a-color-fg3 b-hover-invert",
            style: "display: none",
            type: "button",
        },
        text: "\u2716", //cross mark
    },
    result: {
        tag : "p",
        attr: {
            class: "entry-result a-color-fg1",
            style: "display: none",
        },
    },
    ui: {tag: "div", attr: {class: "entry-ui"}},
    word: {tag: "p"},
    wordBox: {tag: "div", attr: {class: "entry-word"}},

};

settings.kanjiQuiz.solution.html = {
    container: {tag: "ruby"},
    input: {tag: "span"},
    marked: {tag: "strong", attr:{class:"a-color-fg3"}},
    reading: {tag: "rt"},
    text: {tag: "span"},
};

settings.kanjiQuiz.solution.js = {
    // css class for styling the parts of a word replaced by user input
    unsetClass: "quiz-hidden-kanji",
};
