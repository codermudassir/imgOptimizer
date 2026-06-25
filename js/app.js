/* =========================================================
   PRESSLY — app.js
   Everything here runs against in-memory File/Blob objects.
   No fetch, no XHR for the image data itself — conversion is
   handed off to a Web Worker so the UI thread never blocks.
========================================================= */

/* =========================
   DOM ELEMENTS
========================= */
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const fileList = document.getElementById('file-list');
const bulkBar = document.getElementById('bulk-bar');
const bulkCount = document.getElementById('bulk-count');
const addMoreBtn = document.getElementById('add-more-btn');
const processAllBtn = document.getElementById('process-all');
const downloadAllBtn = document.getElementById('download-all');
const clearAllBtn = document.getElementById('clear-all');
const themeToggle = document.getElementById('theme-toggle');
const formatSelect = document.getElementById('format-select');
const qualitySlider = document.getElementById('quality-slider');
const qualityValue = document.getElementById('quality-value');
const qualityControlGroup = document.getElementById('quality-control-group');
const presetChips = document.querySelectorAll('[data-preset]');
const qualityBubble = document.getElementById('quality-bubble');
const qualityTicks = document.getElementById('quality-ticks');
const modalQualityBubble = document.getElementById('modal-quality-bubble');
const modalQualityTicks = document.getElementById('modal-quality-ticks');

/* Preview modal */
const previewModal = document.getElementById('preview-modal');
const closePreviewBtn = document.getElementById('close-modal');
const previewImage = document.getElementById('modal-image');
const previewDownload = document.getElementById('modal-download');

/* Settings modal */
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-modal');
const settingsImg = document.getElementById('settings-modal-img');
const settingsFilename = document.getElementById('settings-modal-filename');
const modalFormatSelect = document.getElementById('modal-format-select');
const modalQualityGroup = document.getElementById('modal-quality-group');
const modalQualitySlider = document.getElementById('modal-quality-slider');
const modalQualityValue = document.getElementById('modal-quality-value');
const modalResizeToggle = document.getElementById('modal-resize-toggle');
const modalResizeFields = document.getElementById('modal-resize-fields');
const modalWidthInput = document.getElementById('modal-width-input');
const modalHeightInput = document.getElementById('modal-height-input');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalApplyBtn = document.getElementById('modal-apply-btn');
const modalPresetChips = document.querySelectorAll('[data-modal-preset]');

/* =========================
   STATE
========================= */
let filesStore = new Map();
let worker;
let activeSettingsId = null; // which card the settings modal is currently editing

/* =========================
   INIT
========================= */
// document.addEventListener('DOMContentLoaded', () => {
//     const currentPage =
//     document.body.dataset.page;
//     initWorker();
//     setupEventListeners();
//     setupTheme();
//     setupFAQ();
//     setupModals();
//     setupMobileSidebar();
//     syncQualityControlVisibility(formatSelect.value, qualityControlGroup, qualitySlider);
//     syncPresetActiveState(presetChips, +qualitySlider.value);
//     buildTicks(qualityTicks, qualitySlider);
//     buildTicks(modalQualityTicks, modalQualitySlider);
//     positionBubble(qualitySlider, qualityBubble, qualitySlider.value);
//     positionBubble(modalQualitySlider, modalQualityBubble, modalQualitySlider.value);
//     loadPendingFiles();
// });

document.addEventListener('DOMContentLoaded', () => {

    const currentPage = document.body.dataset.page;

    setupEventListeners();
    setupTheme();
    setupFAQ();
    setupMobileSidebar();

    if (currentPage === 'upload') {

        initWorker();
        setupModals();

        syncQualityControlVisibility(
            formatSelect.value,
            qualityControlGroup,
            qualitySlider
        );

        syncPresetActiveState(
            presetChips,
            +qualitySlider.value
        );

        buildTicks(
            qualityTicks,
            qualitySlider
        );

        buildTicks(
            modalQualityTicks,
            modalQualitySlider
        );

        positionBubble(
            qualitySlider,
            qualityBubble,
            qualitySlider.value
        );

        positionBubble(
            modalQualitySlider,
            modalQualityBubble,
            modalQualitySlider.value
        );

        // loadPendingFiles();
    }

});
function initWorker() {
    worker = new Worker('workers/processor.worker.js');
    worker.onmessage = handleWorkerMessage;
}

/* =========================
   MOBILE SIDEBAR
========================= */
function setupMobileSidebar() {
    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.mobile-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const closeBtn = document.querySelector('.close-sidebar');

    const open = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
    const close = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };

    hamburger?.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
    sidebar?.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
}

/* =========================
   PREVIEW MODAL
========================= */
function setupModals() {
    closePreviewBtn.addEventListener('click', hidePreviewModal);
    previewModal.addEventListener('click', e => e.target === previewModal && hidePreviewModal());

    closeSettingsBtn.addEventListener('click', hideSettingsModal);
    settingsModal.addEventListener('click', e => e.target === settingsModal && hideSettingsModal());
    modalCancelBtn.addEventListener('click', hideSettingsModal);
    modalApplyBtn.addEventListener('click', applySettingsAndConvert);

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        hidePreviewModal();
        hideSettingsModal();
    });

  modalQualitySlider.addEventListener('input', e => {
    modalQualityValue.textContent = `${e.target.value}%`;
    syncPresetActiveState(modalPresetChips, +e.target.value);
    positionBubble(modalQualitySlider, modalQualityBubble, e.target.value); // ADD
});
modalPresetChips.forEach(chip => {
    chip.addEventListener('click', () => {
        const value = +chip.dataset.modalPreset;
        modalQualitySlider.value = value;
        modalQualityValue.textContent = `${value}%`;
        syncPresetActiveState(modalPresetChips, value);
        positionBubble(modalQualitySlider, modalQualityBubble, value); // ADD
    });
});

    modalFormatSelect.addEventListener('change', e => {
        syncQualityControlVisibility(e.target.value, modalQualityGroup, modalQualitySlider);
    });

    modalResizeToggle.addEventListener('click', () => {
        const isHidden = modalResizeFields.classList.contains('hidden');
        modalResizeFields.classList.toggle('hidden');
        modalResizeToggle.textContent = isHidden ? 'Hide dimensions' : 'Set dimensions';
    });
}

function showPreviewModal(blob, filename) {
    const url = URL.createObjectURL(blob);
    previewImage.src = url;
    previewDownload.href = url;
    previewDownload.download = filename;
    previewModal.classList.add('active');
}

function hidePreviewModal() {
    previewModal.classList.remove('active');
    setTimeout(() => { previewImage.src = ''; }, 250);
}

/* =========================
   SETTINGS MODAL (per-image, independent config)
========================= */
// function showSettingsModal(id) {
//     const data = filesStore.get(id);
//     if (!data) return;

//     activeSettingsId = id;

//     settingsImg.src = data.previewUrl;
//     settingsFilename.textContent = data.file.name;

//     modalFormatSelect.value = data.format;
//     modalQualitySlider.value = data.quality;
//     modalQualityValue.textContent = `${data.quality}%`;
//     syncQualityControlVisibility(data.format, modalQualityGroup, modalQualitySlider);
//     syncPresetActiveState(modalPresetChips, data.quality);

//     const hasResize = !!(data.targetWidth || data.targetHeight);
//     modalResizeFields.classList.toggle('hidden', !hasResize);
//     modalResizeToggle.textContent = hasResize ? 'Hide dimensions' : 'Set dimensions';
//     modalWidthInput.value = data.targetWidth || '';
//     modalHeightInput.value = data.targetHeight || '';

//     settingsModal.classList.add('active');
// }

function showSettingsModal(id) {
    const data = filesStore.get(id);
    if (!data) return;

    activeSettingsId = id;

    settingsImg.src = data.previewUrl;
    settingsFilename.textContent = data.file.name;

    modalFormatSelect.value = data.format;
    modalQualitySlider.value = data.quality;
    modalQualityValue.textContent = `${data.quality}%`;
    syncQualityControlVisibility(data.format, modalQualityGroup, modalQualitySlider);
    syncPresetActiveState(modalPresetChips, data.quality);
    positionBubble(modalQualitySlider, modalQualityBubble, data.quality); // ADD

    const hasResize = !!(data.targetWidth || data.targetHeight);
    modalResizeFields.classList.toggle('hidden', !hasResize);
    modalResizeToggle.textContent = hasResize ? 'Hide dimensions' : 'Set dimensions';
    modalWidthInput.value = data.targetWidth || '';
    modalHeightInput.value = data.targetHeight || '';

    settingsModal.classList.add('active');
}

function hideSettingsModal() {
    settingsModal.classList.remove('active');
    activeSettingsId = null;
}

function applySettingsAndConvert() {
    if (!activeSettingsId) return;
    const id = activeSettingsId;
    const data = filesStore.get(id);
    if (!data) return;

    data.format = modalFormatSelect.value;
    data.quality = +modalQualitySlider.value;
    data.targetWidth = modalWidthInput.value ? +modalWidthInput.value : null;
    data.targetHeight = modalHeightInput.value ? +modalHeightInput.value : null;
    data.isDirty = true;
    data.resultBlob = null;

    syncCardControls(id);
    resetCardActions(id);
    hideSettingsModal();
    processFile(id);
}

/* =========================
   EVENT LISTENERS
========================= */
function setupEventListeners() {
    uploadArea?.addEventListener('click', () => fileInput.click());
    browseBtn?.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
    addMoreBtn?.addEventListener('click', () => fileInput.click());

    uploadArea?.addEventListener('dragover', e => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea?.addEventListener('drop', handleDrop);

    fileInput?.addEventListener('change', handleFileSelect);

    processAllBtn?.addEventListener('click', processAllFiles);
    downloadAllBtn?.addEventListener('click', downloadAllFiles);
    clearAllBtn?.addEventListener('click', clearAll);
    themeToggle?.addEventListener('click', toggleTheme);

   qualitySlider?.addEventListener('input', e => {
    qualityValue.textContent = `${e.target.value}%`;
    syncPresetActiveState(presetChips, +e.target.value);
    applyBulkQualityToAll(+e.target.value);
    positionBubble(qualitySlider, qualityBubble, e.target.value); // ADD

    
});

presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
        const value = +chip.dataset.preset;
        qualitySlider.value = value;
        qualityValue.textContent = `${value}%`;
        syncPresetActiveState(presetChips, value);
        applyBulkQualityToAll(value);
        positionBubble(qualitySlider, qualityBubble, value); // ADD
    });
});

    formatSelect?.addEventListener('change', e => {
        syncQualityControlVisibility(e.target.value, qualityControlGroup, qualitySlider);
        applyBulkFormatToAll(e.target.value);
    });


}

/* =========================
   BULK BAR → PROPAGATE TO EVERY CARD
   The header controls are the "applies to all" controls. Whatever they
   show is what Convert All uses, and each card's own tag/preview updates
   immediately so there's no surprise at conversion time.
========================= */
function applyBulkFormatToAll(format) {
    filesStore.forEach((data, id) => {
        data.format = format;
        data.isDirty = true;
        data.resultBlob = null;
        syncCardControls(id);
        resetCardActions(id);
    });
    updateDownloadAllButton();
}

function applyBulkQualityToAll(quality) {
    filesStore.forEach((data, id) => {
        data.quality = quality;
        data.isDirty = true;
        data.resultBlob = null;
        resetCardActions(id);
    });
    updateDownloadAllButton();
}

/* =========================
   FILE HANDLING
========================= */
function handleFileSelect(e) {
    addFiles(Array.from(e.target.files));
    e.target.value = '';
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
}

function addFiles(files) {
    if (!files.length) return;

    // The dropzone's job is done — the bulk control bar takes its place,
    // and the dropzone only reappears once the batch is fully cleared.
    uploadArea.classList.add('hidden');
    bulkBar.classList.remove('hidden');
    fileList.classList.remove('hidden');

    files.forEach(file => {
        const id = crypto.randomUUID();
        filesStore.set(id, {
            file,
            previewUrl: URL.createObjectURL(file),
            originalSize: file.size,
            format: formatSelect.value,
            quality: +qualitySlider.value,
            targetWidth: null,
            targetHeight: null,
            resultBlob: null,
            isDirty: true,
            hasError: false
        });
        renderFileItem(id, file);
    });

    updateBulkCount();
}

/* =========================
   RENDER FILE CARD
========================= */
function renderFileItem(id, file) {
    const data = filesStore.get(id);

    const item = document.createElement('div');
    item.className = 'file-card';
    item.id = `item-${id}`;

    item.innerHTML = `
        <div class="file-thumb">
            <img src="${data.previewUrl}" alt="${escapeHtml(file.name)}">
            <span class="file-format-tag" id="tag-${id}">${formatLabel(data.format)}</span>
            <div class="file-thumb-overlay">
                <button class="file-gear-btn" id="gear-${id}" type="button" aria-label="Open settings for ${escapeHtml(file.name)}">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                </button>
            </div>
        </div>

        <div class="file-body">
            <p class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</p>

            <div class="file-meta">
                <div class="file-meta-row">
                    <span>Original</span>
                    <span class="file-size">${formatBytes(data.originalSize)}</span>
                </div>
                <div class="file-meta-row">
                    <span class="file-status file-status--ready" id="status-${id}">
                        <span class="file-status-dot"></span> Ready
                    </span>
                </div>
            </div>

            <div class="file-actions" id="actions-${id}">
                <button class="btn-secondary" type="button">Convert</button>
            </div>
        </div>
    `;

    fileList.appendChild(item);

    item.querySelector(`#gear-${id}`).addEventListener('click', e => {
        e.stopPropagation();
        showSettingsModal(id);
    });

    item.querySelector('.file-actions .btn-secondary').addEventListener('click', () => processFile(id));
}

function syncCardControls(id) {
    const tag = document.getElementById(`tag-${id}`);
    if (tag) tag.textContent = formatLabel(filesStore.get(id).format);
}

/* =========================
   RESET CARD ACTIONS
========================= */
function resetCardActions(id) {
    updateStatus(id, 'Ready', 'ready');

    const actions = document.getElementById(`actions-${id}`);
    if (actions) {
        actions.innerHTML = `<button class="btn-secondary" type="button">Convert</button>`;
        actions.querySelector('button').addEventListener('click', () => processFile(id));
    }

    document.getElementById(`item-${id}`)?.classList.remove('is-error');

    // Clear any stale "Converted — −N%" row left over from a previous run
    // with different settings; it no longer describes the current config.
    document.querySelector(`#item-${id} .file-meta-row--result`)?.remove();
}

/* =========================
   PROCESS FILE
========================= */
function processFile(id) {
    const data = filesStore.get(id);
    if (!data) return;

    updateStatus(id, 'Converting…', 'processing');
    document.getElementById(`item-${id}`)?.classList.add('is-processing');
    document.getElementById(`item-${id}`)?.classList.remove('is-error');

    worker.postMessage({
        id,
        file: data.file,
        settings: {
            format: data.format,
            quality: data.quality / 100,
            targetWidth: data.targetWidth || null,
            targetHeight: data.targetHeight || null
        }
    });
}

function processAllFiles() {
    filesStore.forEach((_, id) => processFile(id));
}

/* =========================
   WORKER RESPONSE
========================= */
function handleWorkerMessage(e) {
    const { id, success, blob, error } = e.data;
    const data = filesStore.get(id);
    if (!data) return;

    const card = document.getElementById(`item-${id}`);
    card?.classList.remove('is-processing');

    if (!success) {
        data.hasError = true;
        updateStatus(id, 'Failed', 'error');
        card?.classList.add('is-error');

        const actions = document.getElementById(`actions-${id}`);
        if (actions) {
            actions.innerHTML = `<button class="btn-secondary" type="button">Try again</button>`;
            actions.querySelector('button').addEventListener('click', () => processFile(id));
        }
        console.error(`Conversion failed for ${data.file.name}:`, error);
        return;
    }

    data.resultBlob = blob;
    data.isDirty = false;
    data.hasError = false;

    const reduction = 100 - (blob.size / data.originalSize) * 100;
    updateStatus(id, 'Converted', 'done');

    const actions = document.getElementById(`actions-${id}`);
    const ext = data.format.split('/')[1];
    const name = `optimized_${stripExt(data.file.name)}.${ext}`;
    const url = URL.createObjectURL(blob);

    const diffMarkup = `
        <div class="size-diff">
            <span class="file-size">${formatBytes(blob.size)}</span>
            <span class="size-diff-pct ${reduction >= 0 ? 'is-smaller' : 'is-larger'}">
                ${reduction >= 0 ? '−' : '+'}${Math.abs(reduction).toFixed(0)}%
            </span>
        </div>`;

    const metaRow = document.querySelector(`#item-${id} .file-meta`);
    let resultRow = metaRow.querySelector('.file-meta-row--result');
    if (!resultRow) {
        resultRow = document.createElement('div');
        resultRow.className = 'file-meta-row file-meta-row--result';
        metaRow.appendChild(resultRow);
    }
    resultRow.innerHTML = `<span>Converted</span>${diffMarkup}`;

    actions.innerHTML = `
        <button class="btn-ghost" type="button" id="preview-btn-${id}">Preview</button>
        <a class="btn-primary" download="${name}" href="${url}">Download</a>
    `;
    actions.querySelector(`#preview-btn-${id}`).addEventListener('click', () => showPreviewModal(blob, name));

    updateDownloadAllButton();
}

/* =========================
   HELPERS
========================= */
function updateStatus(id, text, state) {
    const el = document.getElementById(`status-${id}`);
    if (!el) return;
    el.className = `file-status file-status--${state}`;
    el.innerHTML = `<span class="file-status-dot"></span> ${text}`;
}

function removeFile(id) {
    const data = filesStore.get(id);
    if (data?.previewUrl) URL.revokeObjectURL(data.previewUrl);
    filesStore.delete(id);
    document.getElementById(`item-${id}`)?.remove();
    updateBulkCount();
    updateDownloadAllButton();
}

function clearAll() {
    filesStore.forEach(data => data.previewUrl && URL.revokeObjectURL(data.previewUrl));
    filesStore.clear();
    fileList.innerHTML = '';

    fileList.classList.add('hidden');
    bulkBar.classList.add('hidden');
    uploadArea.classList.remove('hidden');
    downloadAllBtn.classList.add('hidden');
}

function updateBulkCount() {
    const n = filesStore.size;
    bulkCount.textContent = `${n} image${n === 1 ? '' : 's'}`;
}

function updateDownloadAllButton() {
    const converted = [...filesStore.values()].filter(f => f.resultBlob);
    downloadAllBtn.classList.toggle('hidden', converted.length === 0);
}

function syncQualityControlVisibility(format, groupEl, sliderEl) {
    // PNG ignores the quality parameter in the Canvas API, so the
    // control is disabled rather than left silently meaningless.
    const isPng = format === 'image/png';
    sliderEl.disabled = isPng;
    groupEl.style.opacity = isPng ? '0.45' : '1';
}

function syncPresetActiveState(chips, value) {
    chips.forEach(chip => {
        const presetValue = +(chip.dataset.preset ?? chip.dataset.modalPreset);
        chip.classList.toggle('is-active', presetValue === value);
    });
}

function formatLabel(mime) {
    return mime.split('/')[1].toUpperCase();
}

function stripExt(filename) {
    const idx = filename.lastIndexOf('.');
    return idx > 0 ? filename.slice(0, idx) : filename;
}

function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}
function buildTicks(container, sliderEl) {
    if (!container || !sliderEl) return;
    const min = +sliderEl.min;
    const max = +sliderEl.max;
    container.innerHTML = '';
    for (let v = min; v <= max; v++) {
        container.appendChild(document.createElement('span'));
    }
}

function positionBubble(sliderEl, bubbleEl, displayValue) {
    if (!sliderEl || !bubbleEl) return;
    const min = +sliderEl.min;
    const max = +sliderEl.max;
    const percent = ((sliderEl.value - min) / (max - min)) * 100;
    const offset = 16 - (percent * 0.32);
    bubbleEl.style.left = `calc(${percent}% + ${offset}px)`;
    bubbleEl.querySelector('span').textContent = `${displayValue}%`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* =========================
   THEME & FAQ
========================= */
function setupTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

function setupFAQ() {
    document.querySelectorAll('.faq-question').forEach(q => {
        q.setAttribute('aria-expanded', 'false');
        q.addEventListener('click', () => {
            const answer = q.nextElementSibling;
            const isOpen = answer.classList.toggle('active');
            q.setAttribute('aria-expanded', String(isOpen));
        });
    });
}

/* =========================
   ZIP DOWNLOAD
========================= */
async function downloadAllFiles() {
    const zip = new JSZip();
    let hasFiles = false;

    filesStore.forEach(data => {
        if (!data.resultBlob) return;
        hasFiles = true;
        const ext = data.format.split('/')[1];
        const filename = `optimized_${stripExt(data.file.name)}.${ext}`;
        zip.file(filename, data.resultBlob);
    });

    if (!hasFiles) return;

    downloadAllBtn.disabled = true;
    const originalLabel = downloadAllBtn.innerHTML;
    downloadAllBtn.textContent = 'Zipping…';

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'pressly-converted.zip';
    a.click();
    URL.revokeObjectURL(url);

    downloadAllBtn.disabled = false;
    downloadAllBtn.innerHTML = originalLabel;
}

