const form = document.querySelector('form');
const resetButton = document.querySelector('button#reset');

async function updateUi() {
    const settings = await readSettings();
    for (const [a, b] of Object.entries(settings)) {
        form[a].value = b;
    }
}

updateUi();

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (event.submitter === resetButton) {
        await resetSettings();
        updateUi();
        return;
    }

    const settings = Object.fromEntries(new FormData(form).entries());
    saveSettings(settings);
});
