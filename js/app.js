

/* =========================
   DOM ELEMENTS
========================= */
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const controls = document.getElementById('controls');
const actionArea = document.getElementById('action-area');
const processAllBtn = document.getElementById('process-all');
const downloadAllBtn = document.getElementById('download-all');
const clearAllBtn = document.getElementById('clear-all');
const themeToggle = document.getElementById('theme-toggle');
const formatSelect = document.getElementById('format-select');

/* =========================
   MODAL ELEMENTS
========================= */
const modal = document.getElementById('preview-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalImage = document.getElementById('modal-image');
const modalDownload = document.getElementById('modal-download');

/* =========================
   STATE
========================= */
let filesStore = new Map();
let worker;

/* =========================
   INIT
========================= */
document.addEventListener('DOMContentLoaded', () => {
    initWorker();
    setupEventListeners();
    setupTheme();
    setupFAQ();
    setupModal();
});

function initWorker() {
    worker = new Worker('workers/processor.worker.js');
    worker.onmessage = handleWorkerMessage;
}

/* =========================
   MODAL
========================= */
function setupModal() {
    closeModalBtn.addEventListener('click', hideModal);
    modal.addEventListener('click', e => e.target === modal && hideModal());
    document.addEventListener('keydown', e => e.key === 'Escape' && hideModal());
}

function showModal(blob, filename) {
    const url = URL.createObjectURL(blob);
    modalImage.src = url;
    modalDownload.href = url;
    modalDownload.download = filename;
    modal.classList.add('active');
}

function hideModal() {
    modal.classList.remove('active');
    setTimeout(() => modalImage.src = '', 300);
}

/* =========================
   EVENT LISTENERS
========================= */
function setupEventListeners() {
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', e => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    uploadArea.addEventListener('dragleave', () =>
        uploadArea.classList.remove('drag-over')
    );
    uploadArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);

    processAllBtn.addEventListener('click', processAllFiles);
    clearAllBtn.addEventListener('click', clearAll);
    themeToggle.addEventListener('click', toggleTheme);

    formatSelect.addEventListener('change', e => {
        document.querySelectorAll('.file-format-select').forEach(select => {
            select.value = e.target.value;
            select.dispatchEvent(new Event('change'));
        });
    });
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
    addFiles(
        Array.from(e.dataTransfer.files).filter(f =>
            f.type.startsWith('image/')
        )
    );
}

function addFiles(files) {
    if (!files.length) return;

    fileList.classList.remove('hidden');
    actionArea.classList.remove('hidden');

    files.forEach(file => {
        const id = crypto.randomUUID();
        filesStore.set(id, {
            file,
            originalSize: file.size,
            format: formatSelect.value,
            quality: 80,
            resultBlob: null,
            isDirty: true
        });
        renderFileItem(id, file);
    });
}

/* =========================
   RENDER FILE ITEM
========================= */
function renderFileItem(id, file) {
    const data = filesStore.get(id);

    const item = document.createElement('div');
    item.className = 'file-item';
    item.id = `item-${id}`;

    item.innerHTML = `
        <img src="${URL.createObjectURL(file)}" class="file-preview">
        <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-meta">Original: ${formatBytes(data.originalSize)}</div>
            <div class="status-text" id="status-${id}">Ready</div>

            <div class="file-controls">
                <select class="file-format-select">
                    <option value="image/webp">WebP</option>
                    <option value="image/jpeg">JPEG</option>
                    <option value="image/png">PNG</option>
                </select>

                <span class="img-quality">Img Quality</span>
                <input type="range" min="1" max="100" value="80">
                <span class="quality-label">80%</span>
            </div>
        </div>

        <div class="file-actions" id="actions-${id}">
            <button class="btn-primary">Convert</button>
            <button class="btn-secondary">Remove</button>
        </div>
    `;

    const slider = item.querySelector('input[type="range"]');
    const label = item.querySelector('.quality-label');
    const formatSel = item.querySelector('.file-format-select');

    formatSel.value = data.format;

    slider.addEventListener('input', e => {
        data.quality = +e.target.value;
        data.isDirty = true;
        data.resultBlob = null;
        label.textContent = `${data.quality}%`;
        resetActions(id);
    });

    formatSel.addEventListener('change', e => {
        data.format = e.target.value;
        data.isDirty = true;
        data.resultBlob = null;
        resetActions(id);
    });

    item.querySelector('.btn-primary').onclick = () => processFile(id);
    item.querySelector('.btn-secondary').onclick = () => removeFile(id);

    fileList.appendChild(item);
}

/* =========================
   RESET ACTIONS
========================= */
function resetActions(id) {
    updateStatus(id, 'Ready');
    const actions = document.getElementById(`actions-${id}`);
    if (!actions) return;

    actions.innerHTML = `
        <button class="btn-primary">Convert</button>
        <button class="btn-secondary">Remove</button>
    `;

    actions.children[0].onclick = () => processFile(id);
    actions.children[1].onclick = () => removeFile(id);
}

/* =========================
   PROCESSING
========================= */
function processFile(id) {
    const data = filesStore.get(id);
    if (!data) return;

    updateStatus(id, 'Processing...', '#2563eb');

    worker.postMessage({
        id,
        file: data.file,
        settings: {
            format: data.format,
            quality: data.quality / 100
        }
    });
}

function processAllFiles() {
    filesStore.forEach((_, id) => processFile(id));
}

/* =========================
   WORKER RESPONSE (REAL SIZE)
========================= */
function handleWorkerMessage(e) {
    const { id, success, blob } = e.data;
    const data = filesStore.get(id);
    if (!data || !success) return;

    data.resultBlob = blob;
    data.isDirty = false;

    const reduction =
        100 - (blob.size / data.originalSize) * 100;

    updateStatus(
        id,
        `Done! ${formatBytes(blob.size)} (-${reduction.toFixed(1)}%)`,
        '#10b981'
    );

    const actions = document.getElementById(`actions-${id}`);
    const ext = data.format.split('/')[1];
    const name = `optimized_${data.file.name.split('.')[0]}.${ext}`;
    const url = URL.createObjectURL(blob);

    actions.innerHTML = `
        <button class="btn-secondary">Preview</button>
        <a class="btn-primary" download="${name}" href="${url}">Download</a>
        <button class="btn-secondary">Remove</button>
    `;

    actions.children[0].onclick = () => showModal(blob, name);
    actions.children[2].onclick = () => removeFile(id);
}

/* =========================
   HELPERS
========================= */
function updateStatus(id, text, color) {
    const el = document.getElementById(`status-${id}`);
    if (el) {
        el.textContent = text;
        if (color) el.style.color = color;
    }
}

function removeFile(id) {
    filesStore.delete(id);
    document.getElementById(`item-${id}`)?.remove();
}

function clearAll() {
    filesStore.clear();
    fileList.innerHTML = '';
    fileList.classList.add('hidden');
    actionArea.classList.add('hidden');
}

function formatBytes(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/* =========================
   THEME & FAQ
========================= */
function setupTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
    const t =
        document.documentElement.getAttribute('data-theme') === 'dark'
            ? 'light'
            : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
}

function setupFAQ() {
    document.querySelectorAll('.faq-question').forEach(q =>
        q.onclick = () =>
            q.nextElementSibling.classList.toggle('active')
    );
}
