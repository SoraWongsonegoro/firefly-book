// --- State ---
let allSnippets = [];
let allCollections = {};
let activeTab = 'all';
let expandedSections = {}; // tracks collapsed/expanded site groups
let currentPage = 1;
let currentListItems = [];
let currentPageType = 'none';
let currentPageMeta = null;
const pageSize = 20;

// --- Init ---

function loadAll(callback) {
    chrome.storage.local.get(['saved_snippets', 'collections'], (result) => {
        allSnippets = result.saved_snippets || [];
        allCollections = result.collections || {};
        if (!allCollections.favorites) {
            allCollections.favorites = [];
            chrome.storage.local.set({ collections: allCollections }, () => {
                if (callback) callback();
                else renderCurrentTab();
            });
            return;
        }
        if (callback) callback();
        else renderCurrentTab();
    });
}

function renderCurrentTab() {
    if (activeTab === 'all') renderAllQuotes();
    if (activeTab === 'by-site') {
        currentPageType = 'none';
        renderBySite();
        updatePager();
    }
    if (activeTab === 'collections') {
        currentPageType = 'none';
        renderCollections();
        updatePager();
    }
}

function paginateItems(items) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
}

function updatePager() {
    const pagerRow = document.getElementById('pager-row');
    const pagerInfo = document.getElementById('pager-info');
    const prev = document.getElementById('pager-prev');
    const next = document.getElementById('pager-next');
    if (!pagerRow || !pagerInfo || !prev || !next) return;

    if (currentPageType === 'all' || currentPageType === 'pageDetail' || currentPageType === 'collectionDetail') {
        pagerRow.style.display = 'flex';
        const total = currentListItems.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const end = Math.min(total, currentPage * pageSize);
        pagerInfo.textContent = `${start}-${end} of ${total}`;
        prev.disabled = currentPage <= 1;
        next.disabled = currentPage >= totalPages;
    } else {
        pagerRow.style.display = 'none';
    }
}

function changePage(delta) {
    const totalPages = Math.max(1, Math.ceil(currentListItems.length / pageSize));
    currentPage = Math.min(Math.max(1, currentPage + delta), totalPages);
    if (currentPageType === 'all') {
        renderQuoteCards(paginateItems(currentListItems));
        updatePager();
    } else if (currentPageType === 'pageDetail') {
        renderPageDetailList(paginateItems(currentListItems));
    } else if (currentPageType === 'collectionDetail') {
        renderCollectionDetailList(currentPageMeta.name, paginateItems(currentListItems));
    }
}

function renderQuoteCards(quotes) {
    const container = document.getElementById('all-quotes-list');
    container.innerHTML = '';
    quotes.forEach(({ snippet, index, fromCollection }) => {
        container.appendChild(makeSnippetCard(snippet, index, fromCollection, true));
    });
}

function renderPageDetailList(items) {
    const detailList = document.getElementById('page-detail-list');
    if (!detailList) return;
    detailList.innerHTML = '';
    items.forEach(({ snippet, index, fromCollection }) => {
        detailList.appendChild(makeSnippetCard(snippet, index, fromCollection, false));
    });
    updatePager();
}

function renderCollectionDetailList(name, items) {
    const detailList = document.getElementById('collection-detail-list');
    if (!detailList) return;
    detailList.innerHTML = '';
    items.forEach(({ snippet, index, fromCollection }) => {
        detailList.appendChild(makeSnippetCard(snippet, index, fromCollection || name, true));
    });
    updatePager();
}

// --- UI initialization (attach DOM listeners safely) ---
function initUI() {
    // Tab switching
    document.querySelectorAll('.tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            activeTab = tab.dataset.tab;
            const page = document.getElementById(`page-${activeTab}`);
            if (page) page.classList.add('active');
            renderCurrentTab();
        });
    });

    // Back button for collection detail
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('collection-detail').style.display = 'none';
            document.getElementById('collections-list').style.display = 'block';
            const toolbar = document.querySelector('.toolbar');
            if (toolbar) toolbar.style.display = 'flex';
            currentPageType = 'none';
            currentListItems = [];
            currentPageMeta = null;
            updatePager();
        });
    }

    // Back button for page detail
    const pageBack = document.getElementById('page-back-btn');
    if (pageBack) {
        pageBack.addEventListener('click', () => {
            const listContainer = document.getElementById('by-site-list');
            const detail = document.getElementById('page-detail');
            if (detail) detail.style.display = 'none';
            if (listContainer) listContainer.style.display = 'block';
            currentPageType = 'none';
            currentListItems = [];
            currentPageMeta = null;
            updatePager();
        });
    }

    // Collection popup toggle
    const showCollectionPopup = document.getElementById('show-collection-popup');
    const newCollectionPopup = document.getElementById('new-collection-popup');
    const newCollectionInput = document.getElementById('new-collection-input');
    if (showCollectionPopup && newCollectionPopup) {
        showCollectionPopup.addEventListener('click', (e) => {
            e.stopPropagation();
            newCollectionPopup.classList.toggle('visible');
            if (newCollectionPopup.classList.contains('visible') && newCollectionInput) {
                newCollectionInput.focus();
            }
        });
    }
    document.addEventListener('click', (e) => {
        if (newCollectionPopup && showCollectionPopup && !newCollectionPopup.contains(e.target) && e.target !== showCollectionPopup) {
            newCollectionPopup.classList.remove('visible');
        }
    });

    // Move modal cancellation
    const moveCancel = document.getElementById('move-modal-cancel');
    if (moveCancel) moveCancel.addEventListener('click', closeMoveModal);
    const moveModal = document.getElementById('move-modal');
    if (moveModal) {
        moveModal.addEventListener('click', (e) => {
            if (e.target === moveModal) closeMoveModal();
        });
    }

    // New collection events
    const newCollectionBtn = document.getElementById('new-collection-btn');
    if (newCollectionBtn) {
        newCollectionBtn.addEventListener('click', () => {
            const input = document.getElementById('new-collection-input');
            if (input) {
                createCollection(input.value);
                input.value = '';
                const popup = document.getElementById('new-collection-popup');
                if (popup) popup.classList.remove('visible');
            }
        });
    }
    if (newCollectionInput) {
        newCollectionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                createCollection(e.target.value);
                e.target.value = '';
                const popup = document.getElementById('new-collection-popup');
                if (popup) popup.classList.remove('visible');
            }
        });
    }

    // Pager buttons (visual)
    const pagerPrev = document.getElementById('pager-prev');
    const pagerNext = document.getElementById('pager-next');
    if (pagerPrev) pagerPrev.addEventListener('click', () => changePage(-1));
    if (pagerNext) pagerNext.addEventListener('click', () => changePage(1));
}

// --- All Quotes page ---

function renderAllQuotes() {
    const container = document.getElementById('all-quotes-list');
    container.innerHTML = '';
    const collectionNames = Object.keys(allCollections);

    const allQuotes = [
        ...allSnippets.map((snippet, index) => ({ snippet, index, fromCollection: null })),
        ...collectionNames.flatMap(name =>
            allCollections[name].map((snippet, index) => ({ snippet, index, fromCollection: name }))
        )
    ];

    if (allQuotes.length === 0) {
        currentPageType = 'none';
        currentListItems = [];
        container.innerHTML = '<p class="empty-msg">No saved quotes yet.</p>';
        updatePager();
        return;
    }

    currentPageType = 'all';
    currentListItems = allQuotes;
    currentPage = 1;
    renderQuoteCards(paginateItems(allQuotes));
    updatePager();
}

// --- By Website page ---

function renderBySite() {
    const container = document.getElementById('by-site-list');
    const detail = document.getElementById('page-detail');
    if (detail) detail.style.display = 'none';
    if (container) container.style.display = 'block';
    container.innerHTML = '';

    // Build list of pages (grouped by URL/title)
    const collectionNames = Object.keys(allCollections);
    const allQuotes = [
        ...allSnippets.map((snippet, index) => ({ snippet, index, fromCollection: null })),
        ...collectionNames.flatMap(name =>
            allCollections[name].map((snippet, index) => ({ snippet, index, fromCollection: name }))
        )
    ];

    currentPageType = 'none';
    currentListItems = [];
    currentPageMeta = null;

    if (allQuotes.length === 0) {
        container.innerHTML = '<p class="empty-msg">No saved quotes yet.</p>';
        return;
    }

    const pages = {}; // key: url (or generated key), value: { title, url, items[] }
    allQuotes.forEach((item) => {
        const url = typeof item.snippet === 'object' ? item.snippet.url || '__no_url__' : '__no_url__';
        const title = typeof item.snippet === 'object' ? item.snippet.title || url : (typeof item.snippet === 'string' ? '' : '');
        const key = url;
        if (!pages[key]) pages[key] = { title, url, items: [] };
        pages[key].items.push(item);
    });

    const header = document.createElement('div');
    header.id = 'page-count-header';
    header.textContent = `${Object.keys(pages).length} Pages`;
    container.appendChild(header);

    // Render each page as a card: title + count
    Object.values(pages).forEach((p) => {
        const card = document.createElement('div');
        card.className = 'page-item fade';
        card.innerHTML = `
            <div class="meta">
                <div class="title">${p.title || p.url}</div>
                <div class="count">${p.items.length} Highlight${p.items.length!==1?'s':''}</div>
            </div>
            <div class="chev">›</div>
        `;
        card.addEventListener('click', () => openPageDetail(p.url, p.title || p.url, p.items));
        container.appendChild(card);
    });
}

function openPageDetail(url, title, items) {
    const listContainer = document.getElementById('by-site-list');
    const detail = document.getElementById('page-detail');
    const detailTitle = document.getElementById('page-detail-title');

    if (!detail || !detailTitle) return;
    currentPageType = 'pageDetail';
    currentListItems = items;
    currentPageMeta = { type: 'page', url, title, items };
    currentPage = 1;

    listContainer.style.display = 'none';
    detail.style.display = 'flex';
    detailTitle.innerHTML = '';
    const titleLink = document.createElement('a');
    titleLink.href = url || '#';
    titleLink.target = '_blank';
    titleLink.rel = 'noopener';
    titleLink.textContent = `${items.length} Highlights in ${title}`;
    titleLink.style.color = '#111';
    titleLink.style.textDecoration = 'none';
    titleLink.style.fontWeight = '700';
    detailTitle.appendChild(titleLink);

    renderPageDetailList(paginateItems(items));
}


// --- Collections page ---

function renderCollections() {
    const collectionsPage = document.getElementById('collections-list');
    const detailView = document.getElementById('collection-detail');
    const toolbar = document.querySelector('.toolbar');

    currentPageType = 'none';
    currentListItems = [];
    currentPageMeta = null;

    if (toolbar) toolbar.style.display = 'flex';
    collectionsPage.style.display = 'grid';
    detailView.style.display = 'none';
    collectionsPage.innerHTML = '';

    const names = Object.keys(allCollections);
    const sortedNames = names.sort((a, b) => {
        if (a === 'favorites') return -1;
        if (b === 'favorites') return 1;
        return a.localeCompare(b);
    });

    if (sortedNames.length === 0) {
        collectionsPage.innerHTML = '<p class="empty-msg">No collections yet. Add one above.</p>';
        return;
    }

    sortedNames.forEach((name) => {
        const card = document.createElement('div');
        card.className = 'collection-card fade';
        card.innerHTML = `
            <div class="meta">
                <div class="title">${name}</div>
                <div class="count">${allCollections[name].length} Highlight${allCollections[name].length!==1?'s':''}</div>
            </div>
            <div class="chev">›</div>
        `;
        card.addEventListener('click', () => openCollectionDetail(name));
        collectionsPage.appendChild(card);
    });

    updatePager();
}

function openCollectionDetail(name) {
    const collectionsPage = document.getElementById('collections-list');
    const newCollectionRow = document.querySelector('.toolbar');
    const detailView = document.getElementById('collection-detail');
    const detailTitle = document.getElementById('collection-detail-title');

    const snippets = (allCollections[name] || []).map((snippet, index) => ({ snippet, index, fromCollection: name }));
    currentPageType = 'collectionDetail';
    currentListItems = snippets;
    currentPageMeta = { type: 'collection', name, items: snippets };
    currentPage = 1;

    collectionsPage.style.display = 'none';
    if (newCollectionRow) newCollectionRow.style.display = 'none';
    detailView.style.display = 'flex';
    detailTitle.textContent = name;

    if (snippets.length === 0) {
        const detailList = document.getElementById('collection-detail-list');
        if (detailList) detailList.innerHTML = '<p class="empty-msg">No quotes in this collection yet.</p>';
        updatePager();
        return;
    }

    renderCollectionDetailList(name, paginateItems(snippets));
}



// --- Move Modal ---

let pendingMove = null; // { snippet, index, fromCollection }

function openMoveModal(snippet, index, fromCollection) {
    pendingMove = { snippet, index, fromCollection };

    const modal = document.getElementById('move-modal');
    const options = document.getElementById('move-modal-options');
    options.innerHTML = '';

    // Build destination list
    const destinations = [];

    // All collections except the one it's already in
    Object.keys(allCollections).forEach((name) => {
        if (name !== fromCollection) {
            destinations.push({ label: name, value: name });
        }
    });

    if (destinations.length === 0) {
        options.innerHTML = '<p class="empty-msg">No other destinations available.</p>';
    } else {
        destinations.forEach(({ label, value }) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = 'display:block; width:100%; padding:8px 10px; margin-bottom:6px; background:#f8f9fa; border:1px solid #dee2e6; border-radius:4px; cursor:pointer; font-size:13px; text-align:left;';
            btn.addEventListener('mouseover', () => btn.style.background = '#e9ecef');
            btn.addEventListener('mouseout', () => btn.style.background = '#f8f9fa');
            btn.addEventListener('click', () => confirmMove(value));
            options.appendChild(btn);
        });
    }

    modal.style.display = 'flex';
}

function confirmMove(destination) {
    const { snippet, index, fromCollection } = pendingMove;

    chrome.storage.local.get(['saved_snippets', 'collections'], (result) => {
        const savedSnippets = result.saved_snippets || [];
        const collections = result.collections || {};

        if (fromCollection === null) {
            savedSnippets.splice(index, 1);
        } else if (collections[fromCollection]) {
            collections[fromCollection].splice(index, 1);
        }

        if (!collections[destination]) collections[destination] = [];
        collections[destination].push(snippet);

        chrome.storage.local.set({ saved_snippets: savedSnippets, collections }, () => {
            closeMoveModal();
            loadAll();
        });
    });
}

function deleteSnippet(index, fromCollection) {
    chrome.storage.local.get(['saved_snippets', 'collections'], (result) => {
        const savedSnippets = result.saved_snippets || [];
        const collections = result.collections || {};

        if (fromCollection === null) {
            savedSnippets.splice(index, 1);
        } else if (collections[fromCollection]) {
            collections[fromCollection].splice(index, 1);
        }

        chrome.storage.local.set({ saved_snippets: savedSnippets, collections }, () => loadAll());
    });
}

function makeSnippetCard(snippet, index, fromCollection, allowLink = true) {
    const snippetText = typeof snippet === 'object' ? snippet.text : snippet;
    const snippetUrl = typeof snippet === 'object' ? snippet.url : null;
    const snippetTitle = typeof snippet === 'object' ? snippet.title : null;

    const card = document.createElement('div');
    card.className = 'snippet-card fade';

    const body = document.createElement('div');
    body.className = 'snippet-body';

    const text = document.createElement('div');
    text.className = 'snippet-text';
    text.textContent = snippetText;
    body.appendChild(text);

    if (snippetUrl && allowLink) {
        // show small title above the snippet text (site/title) as a clickable header
        const titleEl = document.createElement('a');
        titleEl.className = 'snippet-title';
        let hostLabel = snippetTitle;
        if (!hostLabel) {
            try {
                hostLabel = (new URL(snippetUrl)).hostname;
            } catch (e) {
                hostLabel = snippetUrl;
            }
        }
        titleEl.textContent = hostLabel;
        titleEl.href = snippetUrl;
        titleEl.target = '_blank';
        titleEl.rel = 'noopener';
        body.insertBefore(titleEl, text);
    } else if (snippetTitle) {
        const titleEl = document.createElement('div');
        titleEl.className = 'snippet-title';
        titleEl.textContent = snippetTitle;
        body.insertBefore(titleEl, text);
    }

    card.appendChild(body);

    // small right chevron for navigation affordance
    const arrow = document.createElement('div');
    arrow.textContent = '›';
    arrow.style.cssText = 'font-size:20px;color:#111;align-self:center;padding:0 8px;';
    card.appendChild(arrow);

    // Icon actions (folder/move and trash/delete) in upper-right
    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const moveIcon = document.createElement('button');
    moveIcon.className = 'icon-btn';
    moveIcon.title = 'Move';
    moveIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
    moveIcon.addEventListener('click', (e) => { e.stopPropagation(); openMoveModal(snippet, index, fromCollection); });

    const deleteIcon = document.createElement('button');
    deleteIcon.className = 'icon-btn';
    deleteIcon.title = 'Delete';
    deleteIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
    deleteIcon.addEventListener('click', (e) => { e.stopPropagation(); deleteSnippet(index, fromCollection); });

    actions.appendChild(moveIcon);
    actions.appendChild(deleteIcon);
    card.appendChild(actions);

    return card;
}

function closeMoveModal() {
    document.getElementById('move-modal').style.display = 'none';
    pendingMove = null;
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


// --- Events ---



// Clear-all removed per UI spec - no clear button in popup anymore.

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    loadAll();
});