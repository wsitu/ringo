
main();
function main() {
    let data = new DataManager();
    data.addDict(defaultWords, false);

    let quiz = new kanjiQuiz.Quiz(data);
    quiz.addTo(document.getElementsByTagName("body")[0]);
}

