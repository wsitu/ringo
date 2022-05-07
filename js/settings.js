const settings = {
    kanjiQuiz : {
        entry: {},
        quiz: {},
        solution: {},
        updateSlider: {},
    }
};

settings.kanjiQuiz.quiz.html = {
    beginBtn: {
        tag : "button",
        attr: {
            class: "quiz-control-button a-background-fg1a a-color-bg0a " +
            "",
            type: "button",
        },
        html: "<ruby>次<rt>Next</rt></ruby>"
    },
    body: {
        tag : "div",
        attr: {
            class: "a-background-bg1a",
            style: "display: none",
        },
    },
    container: {tag : "div", attr: {class: ""}},
    difficulty: {
        tag : "input", 
        attr: {
            class: "a-color-fg2a",
            type: "range",
        },
    },
    entries: {tag : "ul", attr: {class: "a-color-bg1b"}},
    intro: {tag : "div", attr: {class: "a-background-bg1a"}},
    submitBtn: {
        tag : "button",
        attr: {
            class: "quiz-control-button a-background-fg1a a-color-bg0a " +
            "",
            type: "button",
        },
        html: "<ruby>次<rt>Next</rt></ruby>"
    },
    word: {tag: "div", attr: {class: "a-background-bg0a a-color-bg1b b-center"},},
    wordsBody: {tag: "dl", attr: {class: ""},},
    wordsBox: {tag: "div"},
    wordDef: {tag: "dd", attr: {class: "a-color-fg1a"},},
    wordText: {tag: "dt", attr: {class: "a-color-fg1a"},},
};

settings.kanjiQuiz.quiz.js = {
    
    // Number of entries in each quiz based on quiz score (times all correct)
    // entry # = floor(<score>/<div>) + <min> capped at <max>
    entries : {div: 4, min: 1, max: 10},
    
    // Same as entries but for the number of entry choices
    entryChoices : {div: 2, min: 4, max: 16},
    
    // Number between 0 and 1 that represents the chance that quiz words are
    // picked by its kanji accuracy (lower accuracy = higher chance)
    weightedWordRatio : 0.75
};

settings.kanjiQuiz.entry.html = {
    answer: {
        tag : "p",
        attr: {
            class: "a-color-fg2a",
            style: "display: none",
        },
    },
    body: {tag: "div", attr: {class: "a-background-bg1a"}},
    choice: {tag: "li",},
    choices: {tag: "ul",  attr: {class: ""}},
    choiceBtn: {
        tag : "button",
        attr: {
            class: "a-background-bg0a a-color-fg1a b-center b-hover-invert",
            type: "button",
        },
    },
    correct: {
        tag : "span",
        attr: {style: "display: none"},
        text: "\u2714", //check mark
    },
    container: {tag: "li", attr: {class: ""}},
    definition: {tag: "p",  attr: {class: "a-color-fg1a"}},
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
            class: "a-color-fg2b",
            style: "display: none",
        },
    },
    ui: {tag: "div", attr: {class: "b-center"}},
    word: {tag: "p"},
    wordBox: {tag: "div", attr: {class: "a-color-fg1a b-center "}},
    wordData: {tag: "div", attr: {class: "a-background-bg0a a-color-bg1b b-center"}},
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
    unsetClass: "kanjiQuiz-solution-input",
};

settings.kanjiQuiz.updateSlider.html = {
    container: {tag: "div", attr: {class: "b-center"},},
    display: {tag: "p"},
    slider: {
        tag : "input",
        attr: {
            class: "a-color-bg0a",
            type: "range",
        },
    },
};

// Appends a class that resembles the setting location on each html element
// with the dot replaced by a hyphen and omitting the "settings" and "html"
// Example: settings.kanjiQuiz.quiz.html.body -> kanjiQuiz-quiz-body
for (const [moduleName, module] of Object.entries(settings)) {
    for (const [compName, component] of Object.entries(module)) {
        for (const [item, htmlSetting] of Object.entries(component.html)) {
            if (htmlSetting.attr == undefined) htmlSetting.attr = {};
            let settingPath = `${moduleName}-${compName}-${item}`;
            if (htmlSetting.attr.class)
                htmlSetting.attr.class += " " + settingPath;
            else
                htmlSetting.attr.class = settingPath;
        }
    }
}
