
main();
function main() {
    let data = new ringo.DataManager();
    data.addDict(defaultWords, false);
    if (data.hasUserStorage())
        data.loadUserData();
    let quiz = new ringo.Quiz(data);
    quiz.addTo(document.getElementsByTagName("body")[0]);
}

