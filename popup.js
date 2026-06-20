const clearBtn = document.getElementById('clear-btn');
const container = document.getElementById('collections-container');
const newCollectionInput = document.getElementById('new-collection-input');
const newCollectionBtn = document.getElementById('new-collection-btn');

// --- Load ---

function loadAll() {
    chrome.storage.local.get(['saved_snippets', 'collections'], (result) => {
        const unsorted = result.saved_snippets || [];
        const collections = result.collections || {};
        renderAll(unsorted, collections);
    });
}

// --- Render ---

function renderAll(unsorted, collections) {
    container.innerHTML = '';
    const collectionNames = Object.keys(collections);

    // Unsorted section
    renderSection('Unsorted', unsorted, collectionNames, false);

    // Collection sections
    collectionNames.forEach((name) => {
        renderSection(name, collections[name], [], true);
    });
}

function renderSection(title, snippets, moveTargets, isDeletable) {
    const block = document.createElement('div');
    block.className = 'collection-block';

    // Header
    const header = document.createElement('div');
    header.className = 'collection-header';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = `${title} (${snippets.length})`;
    header.appendChild(titleSpan);

    if (isDeletable) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-collection-btn';
        deleteBtn.textContent = '✕ Delete';
        deleteBtn.addEventListener('click', () => deleteCollection(title));
        header.appendChild(deleteBtn);
    }

    block.appendChild(header);

    // Snippets
    const ul = document.createElement('ul');

    if (snippets.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-msg';
        empty.textContent = 'No snippets here yet.';
        block.appendChild(empty);
    } else {
        snippets.forEach((snippet, index) => {
            const li = document.createElement('li');

            const text = document.createElement('span');
            text.className = 'snippet-text';
            text.textContent = snippet;
            li.appendChild(text);

            // Only show move controls if there are targets to move to
            if (moveTargets.length > 0) {
                const controls = document.createElement('div');
                controls.className = 'snippet-controls';

                const select = document.createElement('select');
                select.className = 'move-select';
                moveTargets.forEach((name) => {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    select.appendChild(option);
                });

                const moveBtn = document.createElement('button');
                moveBtn.className = 'move-btn';
                moveBtn.textContent = 'Move';
                moveBtn.addEventListener('click', () => {
                    moveToCollection(index, select.value);
                });

                controls.appendChild(select);
                controls.appendChild(moveBtn);
                li.appendChild(controls);
            }

            ul.appendChild(li);
        });
    }

    block.appendChild(ul);
    container.appendChild(block);
}

// --- Actions ---

function createCollection(name) {
    const trimmed = name.trim();
    if (!trimmed) return;

    chrome.storage.local.get(['collections'], (result) => {
        const collections = result.collections || {};

        if (collections[trimmed]) {
            alert(`"${trimmed}" already exists.`);
            return;
        }

        collections[trimmed] = [];
        chrome.storage.local.set({ collections }, loadAll);
    });
}

function deleteCollection(name) {
    if (!confirm(`Delete "${name}" and all its snippets?`)) return;

    chrome.storage.local.get(['collections'], (result) => {
        const collections = result.collections || {};
        delete collections[name];
        chrome.storage.local.set({ collections }, loadAll);
    });
}

function moveToCollection(snippetIndex, targetCollection) {
    chrome.storage.local.get(['saved_snippets', 'collections'], (result) => {
        const unsorted = result.saved_snippets || [];
        const collections = result.collections || {};

        const [snippet] = unsorted.splice(snippetIndex, 1);
        collections[targetCollection].push(snippet);

        chrome.storage.local.set({ saved_snippets: unsorted, collections }, loadAll);
    });
}

function clearAll() {
    if (!confirm('Clear everything?')) return;
    chrome.storage.local.set({ saved_snippets: [], collections: {} }, loadAll);
}

// --- Events ---

newCollectionBtn.addEventListener('click', () => {
    createCollection(newCollectionInput.value);
    newCollectionInput.value = '';
});

newCollectionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        createCollection(newCollectionInput.value);
        newCollectionInput.value = '';
    }
});

clearBtn.addEventListener('click', clearAll);

document.addEventListener('DOMContentLoaded', loadAll);