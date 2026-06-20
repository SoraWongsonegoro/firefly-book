// Ensure this code runs as a Chrome extension content script
if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    console.error('content.js: chrome.storage.local is unavailable. This must run as a Chrome extension content script.');
} else {
    const popupBtn = document.createElement('button');
    popupBtn.textContent = 'Save';
    popupBtn.className = 'ts-ext-save-btn';
    document.body.appendChild(popupBtn);

    const highlightStyle = document.createElement('style');
    highlightStyle.textContent = `
    .generic-highlight {
        background: yellow;
        color: inherit;
        border-radius: 2px;
    }
    `;
    document.head?.appendChild(highlightStyle);

    document.addEventListener('mouseup', (e) => {
        if (popupBtn.contains(e.target)) return;

        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();

        if (selectedText?.length > 0 && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            popupBtn.style.top = `${rect.top + window.scrollY - 35}px`;
            popupBtn.style.left = `${rect.left + window.scrollX + (rect.width / 2) - 25}px`;
            popupBtn.style.display = 'block';
        } else {
            popupBtn.style.display = 'none';
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (!popupBtn || !popupBtn.contains?.(e.target)) {
            if (popupBtn?.style) {
                popupBtn.style.display = 'none';
            }
        }
    });

    popupBtn.addEventListener('click', () => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();

        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
            span.className = 'generic-highlight';
            try {
                range.surroundContents(span);
            } catch (error) {
                console.warn('Could not surround selected contents:', error);
            }
            selection.removeAllRanges();
        }

        if (!selectedText) {
            popupBtn.style.display = 'none';
            return;
        }

        chrome.storage.local.get(['saved_snippets'], (result) => {
            const snippets = result.saved_snippets || [];
            snippets.push(selectedText);
            chrome.storage.local.set({ saved_snippets: snippets }, () => {
                popupBtn.style.display = 'none';
            });
        });
    });
}
