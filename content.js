// Create the hidden Popup Button
const popupBtn = document.createElement('button');
popupBtn.textContent = 'Save';
popupBtn.className = 'ts-ext-save-btn'; // Links to styles.css
document.body.appendChild(popupBtn);

// Inject highlight style into the page
const highlightStyle = document.createElement('style');
highlightStyle.textContent = `
.generic-highlight {
    background: yellow;
    color: inherit;
    border-radius: 2px;
}
`;
document.head?.appendChild(highlightStyle);

// Tooltip Logic: Show button on mouseup
document.addEventListener('mouseup', (e) => {
    if (popupBtn.contains(e.target)) return;

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        popupBtn.style.top = `${rect.top + window.scrollY - 35}px`;
        popupBtn.style.left = `${rect.left + window.scrollX + (rect.width / 2) - 25}px`;
        popupBtn.style.display = 'block';
    } else {
        popupBtn.style.display = 'none';
    }
});

// Hide popup on mousedown (clicking away)
document.addEventListener('mousedown', (e) => {
    if (!popupBtn.contains(e.target)) {
        popupBtn.style.display = 'none';
    }
});

// Save Logic
popupBtn.addEventListener('click', () => {
    const selectedText = window.getSelection().toString().trim();

    const selection = window.getSelection();
    if (!selection.isCollapsed && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
    
        // Create a new span element with our highlight class
        const span = document.createElement('span');
        span.className = 'generic-highlight';
    
        // Wrap the selected content
        range.surroundContents(span);
    
        // Clear selection so it doesn't stay highlighted natively
        selection.removeAllRanges();
    }
    
    if (selectedText) {
        const storage = chrome?.storage?.local;
        if (!storage) {
            console.error('chrome.storage.local is unavailable. Make sure this code runs as a content script, not page-injected script.');
            return;
        }

        // 1. Fetch current snippets from storage
        storage.get(['saved_snippets'], (result) => {
            const snippets = result.saved_snippets || [];
            
            // 2. Add the new text
            snippets.push(selectedText);
            
            // 3. Save it back to storage
            storage.set({ saved_snippets: snippets }, () => {
                popupBtn.style.display = 'none';
                window.getSelection().removeAllRanges(); // Clear highlight
            });
        });
    }
});