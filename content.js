// Create the hidden Popup Button
const popupBtn = document.createElement('button');
popupBtn.textContent = 'Save';
popupBtn.className = 'ts-ext-save-btn';
document.body.appendChild(popupBtn);

// Store the selection before the click clears it
let pendingRange = null;

document.addEventListener('mouseup', (e) => {
    if (popupBtn.contains(e.target)) return;

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
        const range = selection.getRangeAt(0);
        pendingRange = range.cloneRange(); // Save a copy of the range

        const rect = range.getBoundingClientRect();
        popupBtn.style.top = `${rect.top + window.scrollY - 35}px`;
        popupBtn.style.left = `${rect.left + window.scrollX + (rect.width / 2) - 25}px`;
        popupBtn.style.display = 'block';
    } else {
        popupBtn.style.display = 'none';
    }
});

document.addEventListener('mousedown', (e) => {
    if (!popupBtn.contains(e.target)) {
        popupBtn.style.display = 'none';
        pendingRange = null;
    }
});

function highlightRange(range) {
    const highlight = document.createElement('mark');
    highlight.className = 'ts-ext-highlight';
    range.surroundContents(highlight);
}

popupBtn.addEventListener('click', () => {
    if (!pendingRange) return;

    const selectedText = pendingRange.toString().trim();

    if (selectedText) {
        chrome.storage.local.get(['saved_snippets'], (result) => {
            const snippets = result.saved_snippets || [];
            snippets.push(selectedText);

            chrome.storage.local.set({ saved_snippets: snippets }, () => {
                // Apply highlight only after save succeeds
                highlightRange(pendingRange);
                pendingRange = null;

                popupBtn.style.display = 'none';
                window.getSelection().removeAllRanges();
            });
        });
    }
});