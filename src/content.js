let container;
let chunkBuffer = '';

(function () {
    if (!isOnAnalysisView()) {
        return;
    }
    injectPageScript();
    setupUi();
})();

function isOnAnalysisView() {
    return document.querySelector('main.analyse.variant-standard') != null;
}

function injectPageScript() {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = chrome.runtime.getURL('src/page.js');
    document.body.appendChild(script);
}

function getGameId() {
    return window.location.pathname.match(/^\/(\w+)/)[1];
}

function setupUi() {
    const lichessRequestAnalysisForm = document.querySelector('form.future-game-analysis');

    if (lichessRequestAnalysisForm != null) {
        lichessRequestAnalysisForm.addEventListener(
            'submit',
            (event) => {
                const interval = setInterval(() => {
                    if (document.querySelector('div#acpl-chart') === null) {
                        return;
                    }
                    if (document.querySelector('div#acpl-chart-loader') === null) {
                        clearInterval(interval);
                        setupUi();
                    }
                });
            },
            500,
        );
    } else {
        if (container) {
            container.remove();
        }
        container = document.createElement('div');
        container.id = 'chatgpt-analysis';
        container.style.textAlign = 'center';

        const button = document.createElement('button');
        button.classList.add('button');
        button.addEventListener('click', async () => {
            button.classList.add('disabled');
            span.textContent = 'Requesting a ChatGPT analysis...';

            handleRequestAnalysis();
        });

        const span = document.createElement('span');
        span.classList.add('text');
        span.textContent = 'Request a ChatGPT analysis';
        span.dataset.icon = '';

        container.appendChild(button);
        button.appendChild(span);
        document.querySelector('div.computer-analysis').appendChild(container);
    }
}

async function handleRequestAnalysis() {
    const gameId = getGameId();
    const moves = await getMovesPlayed(gameId);
    queryModel(moves);
}

async function getMovesPlayed(gameId) {
    const url = 'https://lichess.org/game/export/' + gameId + '?evals=1&clocks=0';
    const response = await fetch(url);
    const pgn = await response.text();
    return pgn.trim().split(/\n/).at(-1);
}

async function queryModel(moves) {
    const url = 'https://api.openai.com/v1/chat/completions';
    const settings = await readSettings();
    const query = {
        messages: [
            {
                role: 'system',
                content: settings.prompt,
            },
            {
                role: 'user',
                content: moves,
            },
        ],
        model: settings.model,
        temperature: settings.temperature,
        top_p: settings.topP,
        presence_penalty: settings.presencePenalty,
        frequency_penalty: settings.frequencyPenalty,
        stream: true,
    };
    const sse = new SSE(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
        },
        payload: JSON.stringify(query),
    });
    sse.addEventListener('error', (event) => {
        alert('Unexpected error from ChatGPT. Check your API key in extension preferences.');
        reset();
        setupUi();
    });
    sse.addEventListener('message', (event) => {
        if (event.data === '[DONE]') {
            reset();
        } else {
            const data = JSON.parse(event.data);
            data;
            const contentDelta = data.choices[0].delta.content;
            if (contentDelta) {
                handleChunk(contentDelta);
            }
        }
    });
    sse.stream();
}

function handleChunk(chunk) {
    chunkBuffer += chunk;
    const match = chunkBuffer.match(/^\s*\d+.{1,3}? \S+ {(.*?)}/);

    if (match === null) {
        return;
    }

    const comment = match[1];
    annotateNextMove(comment);

    chunkBuffer = chunkBuffer.slice(match[0].length);
}

function reset() {
    chunkBuffer = '';
    container.remove();
}

function annotateNextMove(comment) {
    window.postMessage({ type: 'chatGptComment', comment }, '*');
}
