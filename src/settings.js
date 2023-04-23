async function getPrompt() {
    const response = await fetch(chrome.runtime.getURL('src/prompt.txt'));
    return response.text();
}

async function defaultSettings() {
    return {
        model: 'gpt-3.5-turbo',
        prompt: await getPrompt(),
        temperature: 0.7,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
    };
}

async function readSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, async (data) => {
            const defaults = await defaultSettings();
            const settings = { ...defaults, ...data };
            for (const key of ['temperature', 'topP', 'frequencyPenalty', 'presencePenalty']) {
                settings[key] = Number(settings[key]);
            }
            resolve(settings);
        });
    });
}

function saveSettings(settings) {
    return new Promise((resolve) => {
        chrome.storage.local.set(settings, () => resolve());
    });
}

async function resetSettings() {
    return saveSettings(await defaultSettings());
}
