// --- State ---
let allSnippets = [];
let allCollections = {};
let activeTab = 'all';
let expandedSections = {}; // tracks collapsed/expanded site groups

// --- Init ---

function loadAll(callback) {
    chrome.storage.local.get(['saved_snippets', 'collections'], (result) => {
        allSnippets = result.saved_snippets || [];
        allCollections = result.collections || {};
        if (callback) callback();
        else renderCurrentTab();
    });
}

function renderCurrentTab() {
    if (activeTab === 'all') renderAllQuotes();
    if (activeTab === 'by-site') renderBySite();
    if (activeTab === 'collections') renderCollections();
}

// --- Tab switching ---

document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        activeTab = tab.dataset.tab;
        document.getElementById(`page-${activeTab}`).classList.add('active');
        renderCurrentTab();
    });
});

// --- All Quotes page ---

function renderAllQuotes() {
    const container = document.getElementById('all-quotes-list');
    container.innerHTML = '';
    const collectionNames = Object.keys(allCollections);

    if (allSnippets.length === 0) {
        container.innerHTML = '<p class="empty-msg">No saved quotes yet.</p>';
        return;
    }

    allSnippets.forEach((snippet, index) => {
        container.appendChild(makeSnippetCard(snippet, index, collectionNames, 'unsorted'));
    });
}

// --- By Website page ---

function renderBySite() {
    const container = document.getElementById('by-site-list');
    container.innerHTML = '';

    if (allSnippets.length === 0) {
        container.innerHTML = '<p class="empty-msg">No saved quotes yet.</p>';
        return;
    }

    // Group by hostname
    const groups = {};
    allSnippets.forEach((snippet, index) => {
        const url = typeof snippet === 'object' ? snippet.url : null;
        const host = url ? new URL(url).hostname : 'Unknown site';
        if (!groups[host]) groups[host] = [];
        groups[host].push({ snippet, index });
    });

    const collectionNames = Object.keys(allCollections);

    Object.entries(groups).forEach(([host, items]) => {
        const isExpanded = expandedSections[host] !== false; // default expanded

        // Section header
        const header = document.createElement('div');
        header.className = 'section-header';
        header.innerHTML = `
            <span>${host} <span style="font-weight:normal;color:#888;font-size:12px">(${items.length})</span></span>
            <span class="chevron">${isExpanded ? '▲' : '▼'}</span>
        `;

        const list = document.createElement('div');
        list.className = 'snippet-list';
        list.style.display = isExpanded ? 'block' : 'none';

        header.addEventListener('click', () => {
            expandedSections[host] = list.style.display === 'none';
            list.style.display = list.style.display === 'none' ? 'block' : 'none';
            header.querySelector('.chevron').textContent = list.style.display === 'none' ? '▼' : '▲';
        });

        items.forEach(({ snippet, index }) => {
            list.appendChild(makeSnippetCard(snippet, index, collectionNames, 'unsorted'));
        });

        container.appendChild(header);
        container.appendChild(list);
    });
}

// --- Collections page ---

function renderCollections() {
    const collectionsPage = document.getElementById('collections-list');
    const detailView = document.getElementById('collection-detail');

    collectionsPage.style.display = 'block';
    detailView.style.display = 'none';
    collectionsPage.innerHTML = '';

    const names = Object.keys(allCollections);

    if (names.length === 0) {
        collectionsPage.innerHTML = '<p class="empty-msg">No collections yet. Add one above.</p>';
        return;
    }

    names.forEach((name) => {
        const card = document.createElement('div');
        card.className = 'collection-card';
        card.innerHTML = `
            <span>${name}</span>
            <span class="count">${allCollections[name].length} quote${allCollections[name].length !== 1 ? 's' : ''}</span>
        `;
        card.addEventListener('click', () => openCollectionDetail(name));
        collectionsPage.appendChild(card);
    });
}

function openCollectionDetail(name) {
    const collectionsPage = document.getElementById('collections-list');
    const newCollectionRow = document.querySelector('.toolbar');
    const detailView = document.getElementById('collection-detail');
    const detailTitle = document.getElementById('collection-detail-title');
    const detailList = document.getElementById('collection-detail-list');

    collectionsPage.style.display = 'none';
    newCollectionRow.style.display = 'none';
    detailView.style.display = 'flex';
    detailTitle.textContent = name;
    detailList.innerHTML = '';

    const snippets = allCollections[name];

    if (snippets.length === 0) {
        detailList.innerHTML = '<p class="empty-msg">No quotes in this collection yet.</p>';
        return;
    }

    snippets.forEach((snippet) => {
        const card = makeSnippetCard(snippet, null, [], 'collection');
        detailList.appendChild(card);
    });
}

document.getElementById('back-btn').addEventListener('click', () => {
    document.getElementById('collection-detail').style.display = 'none';
    document.getElementById('collections-list').style.display = 'block';
    document.querySelector('.toolbar').style.display = 'flex';
});

// --- Snippet card builder ---

function makeSnippetCard(snippet, index, collectionNames, context) {
    const snippetText = typeof snippet === 'object' ? snippet.text : snippet;
    const snippetUrl = typeof snippet === 'object' ? snippet.url : null;
    const snippetTitle = typeof snippet === 'object' ? snippet.title : null;

    const card = document.createElement('div');
    card.className = 'snippet-card';

    const body = document.createElement('div');
    body.className = 'snippet-body';

    const text = document.createElement('div');
    text.className = 'snippet-text';
    text.textContent = snippetText;
    body.appendChild(text);

    if (snippetUrl) {
        const source = document.createElement('a');
        source.className = 'snippet-source';
        source.href = snippetUrl;
        source.textContent = snippetTitle || snippetUrl;
        source.target = '_blank';
        body.appendChild(source);
    }

    card.appendChild(body);

    // Move controls — only for unsorted snippets with collections to move to
    if (context === 'unsorted' && collectionNames.length > 0) {
        const controls = document.createElement('div');
        controls.className = 'snippet-controls';

        const select = document.createElement('select');
        select.className = 'move-select';
        collectionNames.forEach((name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });

        const moveBtn = document.createElement('button');
        moveBtn.className = 'move-btn';
        moveBtn.textContent = 'Move';
        moveBtn.addEventListener('click', () => moveToCollection(index, select.value));

        controls.appendChild(select);
        controls.appendChild(moveBtn);
        card.appendChild(controls);
    }

    return card;
}

// --- Actions ---

function moveToCollection(snippetIndex, targetCollection) {
    const unsorted = [...allSnippets];
    const collections = { ...allCollections };
    const [snippet] = unsorted.splice(snippetIndex, 1);
    collections[targetCollection].push(snippet);
    chrome.storage.local.set({ saved_snippets: unsorted, collections }, () => loadAll());
}

function createCollection(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (allCollections[trimmed]) {
        alert(`"${trimmed}" already exists.`);
        return;
    }
    const collections = { ...allCollections, [trimmed]: [] };
    chrome.storage.local.set({ collections }, () => loadAll());
}

function clearAll() {
    if (!confirm('Clear everything?')) return;
    chrome.storage.local.set({ saved_snippets: [], collections: {} }, () => loadAll());
}

// --- Events ---

document.getElementById('new-collection-btn').addEventListener('click', () => {
    const input = document.getElementById('new-collection-input');
    createCollection(input.value);
    input.value = '';
});

document.getElementById('new-collection-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        createCollection(e.target.value);
        e.target.value = '';
    }
});

document.getElementById('clear-btn').addEventListener('click', clearAll);

document.addEventListener('DOMContentLoaded', () => loadAll());