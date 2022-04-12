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
            class: "quiz-control-button a-background-bg0a a-color-fg2a " +
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
            class: "quiz-control-button a-background-bg0a a-color-fg2a " +
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
    entryChoices : {div: 2, min: 6, max: 18},
    
    // Number between 0 and 1 that represents the chance that quiz words are
    // picked by its kanji accuracy (lower accuracy = higher chance)
    weightedWordRatio : 0.75
};

settings.kanjiQuiz.entry.html = {
    answer: {
        tag : "p",
        attr: {
            class: "entry-answer a-color-fg2a",
            style: "display: none",
        },
    },
    body: {tag: "div", attr: {class: "entry-body"}},
    choice: {tag: "li",},
    choices: {tag: "ul",  attr: {class: "entry-choices"}},
    choiceBtn: {
        tag : "button",
        attr: {
            class: "a-background-bg0a a-color-fg1b b-hover-invert",
            type: "button",
        },
    },
    correct: {
        tag : "span",
        attr: {style: "display: none"},
        text: "\u2714", //check mark
    },
    container: {tag: "li", attr: {class: "quiz-entry"}},
    definition: {tag: "p",  attr: {class: ""}},
    incorrect: {
        tag : "button",
        attr: {
            class: "a-background-bg0a a-color-fg3a b-hover-invert",
            style: "display: none",
            type: "button",
        },
        text: "\u2716", //cross mark
    },
    result: {
        tag : "p",
        attr: {
            class: "entry-result a-color-fg2b",
            style: "display: none",
        },
    },
    ui: {tag: "div", attr: {class: "entry-ui"}},
    word: {tag: "p"},
    wordBox: {tag: "div", attr: {class: "entry-word"}},
    wordData: {tag: "div"},
};

settings.kanjiQuiz.solution.html = {
    container: {tag: "ruby"},
    input: {tag: "span"},
    marked: {tag: "strong", attr:{class:"a-color-fg3a"}},
    reading: {tag: "rt"},
    text: {tag: "span"},
};

settings.kanjiQuiz.solution.js = {
    // css class for styling the parts of a word replaced by user input
    unsetClass: "quiz-hidden-kanji",
};

// Labels each element with a data-setting attribute to help locate which
// setting is used to configure it
for (const [moduleName, module] of Object.entries(settings)) {
    for (const [compName, component] of Object.entries(module)) {
        for (const [item, htmlSetting] of Object.entries(component.html)) {
            if (htmlSetting.attr == undefined) htmlSetting.attr = {};
            let settingPath = `${moduleName}.${compName}.html.${item}`;
            htmlSetting.attr["data-setting"] = settingPath;
        }
    }
}
