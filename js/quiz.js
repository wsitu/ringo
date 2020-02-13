function createQuizEntry(placeholder, clue, answer, decoys) {
    var container = document.createElement("li");
    container.classList.add("quiz-entry");
    var question = document.createElement("dl");
    question.classList.add("quiz-question");
    var label = document.createElement("dt");
    label.innerHTML = placeholder;
    var definition = document.createElement("dd");
    definition.innerHTML = clue;
    question.appendChild(label);
    question.appendChild(definition);
    container.appendChild(question);

    var choices = document.createElement("ul");
    choices.classList.add("quiz-answers");
    var choice_labels = Array.from(decoys);
    choice_labels.splice(1, 0, answer); //insert at random index [0,length]
    for (const x of choice_labels) {
        var choice = document.createElement("li");
        choice.innerHTML = x;
        choices.appendChild(choice);
    }
    container.appendChild(choices);
    return container;
}

var testEntry = createQuizEntry("2", "this is a test definition", "入", ["A", "B", "C", "D"]);
var quiz = (document.getElementsByClassName("quiz"))[0];
quiz.appendChild(testEntry);