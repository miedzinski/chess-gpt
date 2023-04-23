(function () {
    let lastAnnotatedMove = 0;
    window.addEventListener('message', (event) => {
        if (event.data.type !== 'chatGptComment') {
            return;
        }
        const moveNumber = lastAnnotatedMove + 1;
        const move = window.lichess.analysis.data.treeParts[moveNumber];
        if (!move.comments) {
            move.comments = [];
        }
        move.comments.push({
            text: event.data.comment,
            by: 'ChatGPT',
        });
        lastAnnotatedMove = moveNumber;
        window.lichess.analysis.redraw();
    });
})();
