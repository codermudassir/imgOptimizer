// /**
//  * Main Application Logic
//  */

// // DOM Elements
// const uploadArea = document.getElementById("upload-area");
// const fileInput = document.getElementById("file-input");
// const fileList = document.getElementById("file-list");
// const controls = document.getElementById("controls");
// const actionArea = document.getElementById("action-area");
// const formatSelect = document.getElementById("format-select");
// const qualitySlider = document.getElementById("quality-slider");
// const qualityValue = document.getElementById("quality-value");
// const widthInput = document.getElementById("width-input");
// const heightInput = document.getElementById("height-input");
// const processAllBtn = document.getElementById("process-all");
// const downloadAllBtn = document.getElementById("download-all");
// const clearAllBtn = document.getElementById("clear-all");
// const themeToggle = document.getElementById("theme-toggle");

// // State
// let filesStore = new Map(); // id -> { file, status, resultBlob, originalSize }
// let worker;

// // Initialize Web Worker
// function initWorker() {
//   worker = new Worker("workers/processor.worker.js");
//   worker.onmessage = handleWorkerMessage;
// }

// // Modal Elements
// const modal = document.getElementById("preview-modal");
// const closeModalBtn = document.getElementById("close-modal");
// const modalImage = document.getElementById("modal-image");
// const modalDownload = document.getElementById("modal-download");

// // Event Listeners
// document.addEventListener("DOMContentLoaded", () => {
//   initWorker();
//   setupEventListeners();
//   setupTheme();
//   setupFAQ();
//   setupModal();
// });

// function setupModal() {
//   closeModalBtn.addEventListener("click", hideModal);
//   modal.addEventListener("click", (e) => {
//     if (e.target === modal) hideModal();
//   });
//   document.addEventListener("keydown", (e) => {
//     if (e.key === "Escape") hideModal();
//   });
// }

// function showModal(blob, filename) {
//   const url = URL.createObjectURL(blob);
//   modalImage.src = url;
//   modalDownload.href = url;
//   modalDownload.download = filename;
//   modal.classList.add("active");
// }

// function hideModal() {
//   modal.classList.remove("active");
//   setTimeout(() => {
//     modalImage.src = "";
//   }, 300);
// }

// function setupEventListeners() {
//   // File Input
//   uploadArea.addEventListener("click", () => fileInput.click());
//   fileInput.addEventListener("change", handleFileSelect);

//   // Drag & Drop
//   uploadArea.addEventListener("dragover", (e) => {
//     e.preventDefault();
//     uploadArea.classList.add("drag-over");
//   });
//   uploadArea.addEventListener("dragleave", () => {
//     uploadArea.classList.remove("drag-over");
//   });
//   uploadArea.addEventListener("drop", handleDrop);

//   // Controls
//   qualitySlider.addEventListener("input", (e) => {
//     qualityValue.textContent = e.target.value;
//   });

//   // Global Settings Listeners
//   formatSelect.addEventListener("change", (e) => {
//     // Update all pending files to match global selection
//     document.querySelectorAll(".file-format-select").forEach((select) => {
//       const id = select.dataset.id;
//       const fileData = filesStore.get(id);
//       if (fileData && fileData.status !== "done") {
//         select.value = e.target.value;
//         fileData.format = e.target.value; // Sync store
//       }
//     });
//   });

//   processAllBtn.addEventListener("click", processAllFiles);
//   clearAllBtn.addEventListener("click", clearAll);
//   downloadAllBtn.addEventListener("click", downloadAllZip);

//   // Theme Toggle
//   themeToggle.addEventListener("click", toggleTheme);
// }

// function handleFileSelect(e) {
//   const files = Array.from(e.target.files);
//   addFiles(files);
//   e.target.value = ""; // Reset input
// }

// function handleDrop(e) {
//   e.preventDefault();
//   uploadArea.classList.remove("drag-over");
//   const files = Array.from(e.dataTransfer.files).filter((file) =>
//     file.type.startsWith("image/"),
//   );
//   addFiles(files);
// }

// function addFiles(files) {
//   if (files.length === 0) return;

//   fileList.classList.remove("hidden");
//   controls.classList.remove("hidden");
//   actionArea.classList.remove("hidden");

//   // Hide upload instructions to save space if many files, or keep it.
//   // For now we keep it but maybe minimize it in future.

//   files.forEach((file) => {
//     const id = Math.random().toString(36).substr(2, 9);
//     filesStore.set(id, {
//       file,
//       status: "pending",
//       resultBlob: null,
//       originalSize: file.size,
//       format: formatSelect.value, // Default to global
//     });
//     renderFileItem(id, file);
//   });
// }

// function renderFileItem(id, file) {
//   const item = document.createElement("div");
//   item.className = "file-item";
//   item.id = `item-${id}`;

//   const sizeStr = formatBytes(file.size);
//   const objectUrl = URL.createObjectURL(file);

//   // item.innerHTML = `
//   //     <img src="${objectUrl}" class="file-preview" alt="${file.name}">
//   //     <div class="file-info">
//   //         <div class="file-name">${file.name}</div>
//   //         <div class="file-meta">Original: ${sizeStr}</div>
//   //         <div class="status-text" id="status-${id}" style="font-weight: 500; font-size: 0.85rem; color: var(--secondary-color);">Ready</div>
//   //     </div>
//   //     <div class="file-actions" id="actions-${id}">
//   //         <button class="btn-secondary remove-btn" data-id="${id}" title="Remove">
//   //             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
//   //         </button>
//   //     </div>
//   // `;

//   item.innerHTML = `
//     <img src="${objectUrl}" class="file-preview" alt="${file.name}">
//     <div class="file-info">
//         <div class="file-name">${file.name}</div>
//         <div class="file-meta">Original: ${sizeStr}</div>
//         <div class="status-text" id="status-${id}">Ready</div>

//         <div class="file-controls">
//             <select class="file-format-select" data-id="${id}">
//                 <option value="image/webp">WebP</option>
//                 <option value="image/jpeg">JPEG</option>
//                 <option value="image/png">PNG</option>
//             </select>

//             <input type="range" class="file-quality" data-id="${id}" 
//                 min="1" max="100" value="80">
//         </div>
//     </div>

//     <div class="file-actions" id="actions-${id}">
//         <button class="btn-primary convert-btn" data-id="${id}">
//             Convert
//         </button>

//         <button class="btn-secondary remove-btn" data-id="${id}">
//             Remove
//         </button>
//     </div>
// `;

//   item
//     .querySelector(".remove-btn")
//     .addEventListener("click", () => removeFile(id));
//   fileList.appendChild(item);
// }

// function removeFile(id) {
//   filesStore.delete(id);
//   document.getElementById(`item-${id}`).remove();
//   if (filesStore.size === 0) {
//     fileList.classList.add("hidden");
//     controls.classList.add("hidden");
//     actionArea.classList.add("hidden");
//     downloadAllBtn.classList.add("hidden");
//   }
// }

// function clearAll() {
//   filesStore.clear();
//   fileList.innerHTML = "";
//   fileList.classList.add("hidden");
//   controls.classList.add("hidden");
//   actionArea.classList.add("hidden");
//   downloadAllBtn.classList.add("hidden");
// }

// function formatBytes(bytes, decimals = 2) {
//   if (bytes === 0) return "0 Bytes";
//   const k = 1024;
//   const dm = decimals < 0 ? 0 : decimals;
//   const sizes = ["Bytes", "KB", "MB", "GB"];
//   const i = Math.floor(Math.log(bytes) / Math.log(k));
//   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
// }

// function processAllFiles() {
//   processAllBtn.disabled = true;
//   processAllBtn.textContent = "Processing...";

//   const quality = parseInt(qualitySlider.value) / 100;
//   const format = formatSelect.value;
//   const targetWidth = widthInput ? parseInt(widthInput.value) || null : null;
//   const targetHeight = heightInput ? parseInt(heightInput.value) || null : null;

//   filesStore.forEach((data, id) => {
//     if (data.status !== "done") {
//       updateStatus(id, "Processing...", "var(--primary-color)");
//       worker.postMessage({
//         id,
//         file: data.file,
//         settings: {
//           quality,
//           format,
//           targetWidth,
//           targetHeight,
//         },
//       });
//     }
//   });

//   // We don't enable button here, handled in individual callbacks or check if all done
// }

// function handleWorkerMessage(e) {
//   const { id, success, blob, error } = e.data;

//   if (success) {
//     const data = filesStore.get(id);
//     if (data) {
//       data.status = "done";
//       data.resultBlob = blob;

//       const newSizeStr = formatBytes(blob.size);
//       const savings =
//         ((data.originalSize - blob.size) / data.originalSize) * 100;
//       const savingsStr =
//         savings > 0
//           ? `-${Math.round(savings)}%`
//           : `+${Math.round(Math.abs(savings))}%`;

//       const statusEl = document.getElementById(`status-${id}`);
//       statusEl.innerHTML = `<span style="color: #10b981;">Done! ${newSizeStr} (${savingsStr})</span>`;

//       const actionsEl = document.getElementById(`actions-${id}`);
//       const downloadName = `optimized_${data.file.name.split(".")[0]}.${formatSelect.value.split("/")[1]}`;

//       actionsEl.innerHTML = `
//                 <button class="btn-secondary preview-btn" title="Preview">
//                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
//                 </button>
//                 <a href="${URL.createObjectURL(blob)}" download="${downloadName}" class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
//                     Download
//                 </a>
//                 <button class="btn-secondary remove-btn" data-id="${id}" title="Remove">
//                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
//                 </button>
//             `;

//       actionsEl
//         .querySelector(".preview-btn")
//         .addEventListener("click", () => showModal(blob, downloadName));
//       actionsEl
//         .querySelector(".remove-btn")
//         .addEventListener("click", () => removeFile(id));
//     }
//   } else {
//     updateStatus(id, `Error: ${error}`, "#ef4444");
//   }

//   const allDone = Array.from(filesStore.values()).every(
//     (f) => f.status === "done",
//   );
//   if (allDone) {
//     processAllBtn.disabled = false;
//     processAllBtn.textContent = "Convert All";
//     downloadAllBtn.classList.remove("hidden");
//   }
// }

// function updateStatus(id, text, color) {
//   const el = document.getElementById(`status-${id}`);
//   if (el) {
//     el.textContent = text;
//     if (color) el.style.color = color;
//   }
// }

// async function downloadAllZip() {
//   downloadAllBtn.textContent = "Zipping...";
//   downloadAllBtn.disabled = true;

//   const zip = new JSZip();
//   const ext = formatSelect.value.split("/")[1];

//   filesStore.forEach((data, id) => {
//     if (data.status === "done" && data.resultBlob) {
//       zip.file(
//         `optimized_${data.file.name.split(".")[0]}.${ext}`,
//         data.resultBlob,
//       );
//     }
//   });

//   const content = await zip.generateAsync({ type: "blob" });
//   const link = document.createElement("a");
//   link.href = URL.createObjectURL(content);
//   link.download = "optimized_images.zip";
//   link.click();

//   downloadAllBtn.textContent = "Download All (ZIP)";
//   downloadAllBtn.disabled = false;
// }

// // Theme Handling
// function setupTheme() {
//   const savedTheme = localStorage.getItem("theme") || "light";
//   document.documentElement.setAttribute("data-theme", savedTheme);
//   updateThemeIcon(savedTheme);
// }

// function toggleTheme() {
//   const current = document.documentElement.getAttribute("data-theme");
//   const next = current === "dark" ? "light" : "dark";
//   document.documentElement.setAttribute("data-theme", next);
//   localStorage.setItem("theme", next);
//   updateThemeIcon(next);
// }

// function updateThemeIcon(theme) {
//   const sun = document.querySelector(".sun-icon");
//   const moon = document.querySelector(".moon-icon");
//   if (theme === "dark") {
//     sun.classList.remove("hidden");
//     moon.classList.add("hidden");
//   } else {
//     sun.classList.add("hidden");
//     moon.classList.remove("hidden");
//   }
// }

// // FAQ Accordion
// function setupFAQ() {
//   document.querySelectorAll(".faq-question").forEach((item) => {
//     item.addEventListener("click", () => {
//       const answer = item.nextElementSibling;
//       answer.classList.toggle("active");
//     });
//   });
// }


/**
 * Updated Main Application Logic
 * Per-file convert system + smart Convert All visibility
 */

// DOM Elements
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const controls = document.getElementById('controls');
const actionArea = document.getElementById('action-area');
const processAllBtn = document.getElementById('process-all');
const downloadAllBtn = document.getElementById('download-all');
const clearAllBtn = document.getElementById('clear-all');
const themeToggle = document.getElementById('theme-toggle');

// Modal Elements
const modal = document.getElementById('preview-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalImage = document.getElementById('modal-image');
const modalDownload = document.getElementById('modal-download');

// State
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
   FILE HANDLING
========================= */

function setupEventListeners() {
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', handleDrop);

    processAllBtn.addEventListener('click', processAllFiles);
    clearAllBtn.addEventListener('click', clearAll);
    downloadAllBtn.addEventListener('click', downloadAllZip);
    themeToggle.addEventListener('click', toggleTheme);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
    e.target.value = '';
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files)
        .filter(file => file.type.startsWith('image/'));
    addFiles(files);
}

function addFiles(files) {
    if (files.length === 0) return;

    fileList.classList.remove('hidden');
    actionArea.classList.remove('hidden');

    files.forEach(file => {
        const id = Math.random().toString(36).substr(2, 9);

        filesStore.set(id, {
            file,
            status: 'pending',
            resultBlob: null,
            originalSize: file.size
        });

        renderFileItem(id, file);
    });

    updateConvertAllVisibility();
}

function renderFileItem(id, file) {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.id = `item-${id}`;

    const sizeStr = formatBytes(file.size);
    const objectUrl = URL.createObjectURL(file);

    item.innerHTML = `
        <img src="${objectUrl}" class="file-preview" alt="${file.name}">
        <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-meta">Original: ${sizeStr}</div>
            <div class="status-text" id="status-${id}">Ready</div>

            <div style="margin-top:8px; display:flex; gap:8px;">
                <select class="file-format-select" data-id="${id}">
                    <option value="image/webp">WebP</option>
                    <option value="image/jpeg">JPEG</option>
                    <option value="image/png">PNG</option>
                </select>

                <input type="range" class="file-quality"
                       data-id="${id}" min="1" max="100" value="80">
            </div>
        </div>

        <div class="file-actions" id="actions-${id}">
            <button class="btn-primary convert-btn" data-id="${id}">
                Convert
            </button>
            <button class="btn-secondary remove-btn" data-id="${id}">
                Remove
            </button>
        </div>
    `;

    item.querySelector('.convert-btn')
        .addEventListener('click', () => convertSingleFile(id));

    item.querySelector('.remove-btn')
        .addEventListener('click', () => removeFile(id));

    fileList.appendChild(item);
}

function convertSingleFile(id) {
    const data = filesStore.get(id);
    if (!data) return;

    const format = document.querySelector(
        `.file-format-select[data-id="${id}"]`
    ).value;

    const quality = document.querySelector(
        `.file-quality[data-id="${id}"]`
    ).value / 100;

    updateStatus(id, 'Processing...', 'var(--primary-color)');

    worker.postMessage({
        id,
        file: data.file,
        settings: {
            format,
            quality,
            targetWidth: null,
            targetHeight: null
        }
    });
}

function processAllFiles() {
    filesStore.forEach((data, id) => {
        if (data.status !== 'done') {
            convertSingleFile(id);
        }
    });
}

function removeFile(id) {
    filesStore.delete(id);
    document.getElementById(`item-${id}`).remove();
    updateConvertAllVisibility();

    if (filesStore.size === 0) {
        fileList.classList.add('hidden');
        actionArea.classList.add('hidden');
        downloadAllBtn.classList.add('hidden');
    }
}

function clearAll() {
    filesStore.clear();
    fileList.innerHTML = '';
    fileList.classList.add('hidden');
    actionArea.classList.add('hidden');
    downloadAllBtn.classList.add('hidden');
}

function updateConvertAllVisibility() {
    if (filesStore.size > 1) {
        processAllBtn.classList.remove('hidden');
    } else {
        processAllBtn.classList.add('hidden');
    }
}

/* =========================
   WORKER RESPONSE
========================= */

function handleWorkerMessage(e) {
    const { id, success, blob, error } = e.data;

    if (!filesStore.has(id)) return;

    if (success) {
        const data = filesStore.get(id);
        data.status = 'done';
        data.resultBlob = blob;

        const newSizeStr = formatBytes(blob.size);
        updateStatus(id, `Done! ${newSizeStr}`, '#10b981');

        const actionsEl = document.getElementById(`actions-${id}`);
        const ext = blob.type.split('/')[1];
        const downloadName =
            `optimized_${data.file.name.split('.')[0]}.${ext}`;

        actionsEl.innerHTML = `
            <button class="btn-secondary preview-btn">Preview</button>
            <a href="${URL.createObjectURL(blob)}"
               download="${downloadName}"
               class="btn-primary">
                Download
            </a>
            <button class="btn-secondary remove-btn" data-id="${id}">
                Remove
            </button>
        `;

        actionsEl.querySelector('.preview-btn')
            .addEventListener('click',
                () => showModal(blob, downloadName));

        actionsEl.querySelector('.remove-btn')
            .addEventListener('click',
                () => removeFile(id));
    } else {
        updateStatus(id, `Error: ${error}`, '#ef4444');
    }

    const allDone =
        Array.from(filesStore.values())
        .every(f => f.status === 'done');

    if (allDone && filesStore.size > 1) {
        downloadAllBtn.classList.remove('hidden');
    }
}

/* =========================
   ZIP DOWNLOAD
========================= */

async function downloadAllZip() {
    downloadAllBtn.textContent = 'Zipping...';
    downloadAllBtn.disabled = true;

    const zip = new JSZip();

    filesStore.forEach((data) => {
        if (data.status === 'done' && data.resultBlob) {
            const ext = data.resultBlob.type.split('/')[1];
            zip.file(
                `optimized_${data.file.name.split('.')[0]}.${ext}`,
                data.resultBlob
            );
        }
    });

    const content = await zip.generateAsync({ type: "blob" });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = "optimized_images.zip";
    link.click();

    downloadAllBtn.textContent = 'Download All (ZIP)';
    downloadAllBtn.disabled = false;
}

/* =========================
   UTIL
========================= */

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat(
        (bytes / Math.pow(k, i)).toFixed(dm)
    ) + ' ' + sizes[i];
}

function updateStatus(id, text, color) {
    const el = document.getElementById(`status-${id}`);
    if (el) {
        el.textContent = text;
        el.style.color = color;
    }
}

/* =========================
   MODAL
========================= */

function setupModal() {
    closeModalBtn.addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });
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
}

/* =========================
   THEME + FAQ (UNCHANGED)
========================= */

function setupTheme() {
    const savedTheme =
        localStorage.getItem('theme') || 'light';
    document.documentElement
        .setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const current =
        document.documentElement
        .getAttribute('data-theme');
    const next = current === 'dark'
        ? 'light' : 'dark';
    document.documentElement
        .setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

function setupFAQ() {
    document.querySelectorAll('.faq-question')
        .forEach(item => {
            item.addEventListener('click', () => {
                item.nextElementSibling
                    .classList.toggle('active');
            });
        });
}