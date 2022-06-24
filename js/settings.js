const settings = {
    kanjiQuiz : {
        entry: {},
        quiz: {},
        solution: {},
        updateSlider: {},
    }
};

settings.kanjiQuiz.quiz.html = {
    accBody: {tag: "dl", attr: {class: "b-center"},},
    accBox: {tag: "div", attr: {class: "a-border-bg0b"},},
    accEntry: {tag: "div", attr: {class: "b-center"},},
    accMoreBtn: {
        tag: "button",
        attr: {class: ""},
        text: "+",
    },
    accText: {tag: "dt", attr: {class: "a-font-medium2"},},
    accVal: {
        tag : "dd",
        attr: {
            class: "a-background-bg0b a-color-bg2b kanjiQuiz-quiz-accVal-bar"},
    },
    beginBtn: {
        tag : "button",
        attr: {
            class: "a-background-fg1a a-background-hv-fg1b a-color-bg0a " +
            "a-font-medium2 quiz-control-button ",
            type: "button",
        },
        html: "<ruby>次<rt>Next</rt></ruby>"
    },
    body: {
        tag : "div",
        attr: {
            class: "a-border-fg1a",
            style: "display: none",
        },
    },
    container: {tag : "div", attr: {class: ""}},
    entries: {tag : "ul", attr: {class: ""}},
    intro: {tag : "div", attr: {class: "a-border-fg1a"}},
    submitBtn: {
        tag : "button",
        attr: {
            class: "a-background-fg1a a-background-hv-fg1b a-color-bg0a " +
            "a-font-medium2 quiz-control-button ",
            type: "button",
        },
        html: "<ruby>次<rt>Next</rt></ruby>"
    },
    word: {tag: "div", attr: {class: "a-border-bg0b b-center"},},
    wordsBody: {tag: "dl", attr: {class: ""},},
    wordsBox: {tag: "div"},
    wordDef: {tag: "dd", attr: {class: ""},},
    wordText: {tag: "dt", attr: {class: "a-font-large1"},},
};

settings.kanjiQuiz.quiz.js = {
    
    // Receives a string percentage for styling the kanji accuracy in intro
    accuracyCSSVariable : "--accuracy",
    
    // The class to toggle when the button in accuracy box is pressed
    accToggleClass: "kanjiQuiz-quiz-accBox-more",
    
    // Number of entries in each quiz based on quiz score (times all correct)
    // entry # = floor(<score>/<div>) + <min> capped at <max>
    entries : {div: 4, min: 1, max: 10},
    
    // Same as entries but for the number of entry choices
    entryChoices : {div: 2, min: 4, max: 16},
    
    // Max number of kanji to list in the intro's accuracy element
    maxAccuracyKanji : 10,
    
    // Number between 0 and 1 that represents the chance that quiz words are
    // picked by its kanji accuracy (lower accuracy = higher chance)
    weightedWordRatio : 0.75
};

settings.kanjiQuiz.entry.html = {
    answer: {
        tag : "p",
        attr: {
            class: "a-font-large1",
            style: "display: none",
        },
    },
    answerBtn: {
        tag : "button",
        attr: {
            class: "a-background-bg2a a-background-hv-bg2b",
            style: "display: none;",
            type: "button",
        },
        text: "?",
    },
    body: {tag: "div", attr: {class: "a-background-bg0a"}},
    choice: {tag: "li",},
    choices: {tag: "ul",  attr: {class: ""}},
    choiceBtn: {
        tag : "button",
        attr: {
            class: "a-background-bg1a a-background-hv-bg1b a-border-fg1c " +
            "a-color-fg0a a-font-medium1 b-center",
            type: "button",
        },
    },
    container: {tag: "li", attr: {class: "a-border-bg0b"}},
    definition: {tag: "p",  attr: {class: ""}},
    ui: {tag: "div", attr: {class: "b-center"}},
    word: {tag: "p"},
    wordBox: {tag: "div", attr: {class: "a-font-large1 b-center "}},
    wordData: {
        tag: "div", 
        attr: {class: "a-background-bg0a a-border-bg0b a-color-fg0a b-center"},
    },
};

settings.kanjiQuiz.entry.js = {
    correctClass: "kanjiQuiz-entry-container-correct",
    hightlightClass: "kanjiQuiz-entry-container-highlight",
    incorrectClass: "kanjiQuiz-entry-container-incorrect",
    
    // data attribute name for button status in camelcase without "data" prefix
    // see kanjiQuiz.entry.markChoices() for info on the values
    answerDataAttr: "answer",
    correctDataAttr: "correct",
};

settings.kanjiQuiz.solution.html = {
    container: {tag: "ruby"},
    input: {tag: "span", attr:{class: ""}},
    marked: {tag: "strong", attr:{class:""}},
    reading: {tag: "rt"},
    text: {tag: "span"},
};

settings.kanjiQuiz.solution.js = {
    // css class for styling the parts of a word replaced by user input
    unsetClass: "kanjiQuiz-solution-input",
};

settings.kanjiQuiz.updateSlider.html = {
    container: {tag: "div", attr: {class: "b-center"},},
    display: {tag: "div"},
    displayItem: {tag: "div", attr: {class: "a-background-bg1b"},},
    slider: {
        tag : "input",
        attr: {
            class: "a-color-fg1a",
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
