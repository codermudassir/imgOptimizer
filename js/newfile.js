// AVIF Converter - Convert AVIF, PNG, JPG, WebP to any format
class AVIFConverter {
    constructor() {
        this.files = [];
        this.selectedFormat = 'image/avif';
        this.selectedQuality = 80;
        this.initializeElements();
        this.attachEventListeners();
        this.loadTheme();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('upload-area');
        this.fileInput = document.getElementById('file-input');
        this.fileList = document.getElementById('file-list');
        this.controls = document.getElementById('controls');
        this.actionArea = document.getElementById('action-area');
        this.formatSelect = document.getElementById('format-select');
        this.qualitySlider = document.getElementById('quality-slider');
        this.qualityValue = document.getElementById('quality-value');
        this.processBtn = document.getElementById('process-all');
        this.downloadBtn = document.getElementById('download-all');
        this.clearBtn = document.getElementById('clear-all');
        this.previewModal = document.getElementById('preview-modal');
        this.modalImage = document.getElementById('modal-image');
        this.modalDownload = document.getElementById('modal-download');
        this.closeModalBtn = document.getElementById('close-modal');
        this.themeToggle = document.getElementById('theme-toggle');
    }

    attachEventListeners() {
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        this.uploadArea.addEventListener('dragover', (e) => e.preventDefault());
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleFileSelect(e.dataTransfer.files);
        });

        this.formatSelect.addEventListener('change', (e) => {
            this.selectedFormat = e.target.value;
            this.updateButtonText();
        });

        this.qualitySlider.addEventListener('input', (e) => {
            this.selectedQuality = e.target.value;
            this.qualityValue.textContent = this.selectedQuality;
        });

        this.processBtn.addEventListener('click', () => this.convertAll());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.downloadBtn.addEventListener('click', () => this.downloadAllAsZip());
        this.closeModalBtn.addEventListener('click', () => this.closePreviewModal());
        this.previewModal.addEventListener('click', (e) => {
            if (e.target === this.previewModal) this.closePreviewModal();
        });

        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    handleFileSelect(files) {
        this.files = Array.from(files).filter(file =>
            ['image/avif', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type)
        );

        if (this.files.length === 0) {
            alert('Please select valid image files (AVIF, PNG, JPG, or WebP)');
            return;
        }

        this.renderFileList();
        this.controls.classList.remove('hidden');
        this.actionArea.classList.remove('hidden');
        this.downloadBtn.classList.add('hidden');
    }

    renderFileList() {
        this.fileList.innerHTML = '';
        this.fileList.classList.remove('hidden');

        this.files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.id = `item-${index}`; // Add ID for easy selection

            function formatBytes(bytes, decimals = 2) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const dm = decimals < 0 ? 0 : decimals;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
            }

            const originalSizeStr = formatBytes(file.size);

            fileItem.innerHTML = `
                <div class="file-info" style="width: 100%;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span class="file-name" style="font-weight:600;">${file.name}</span>
                        <span class="file-size" style="color:var(--text-muted); font-size:0.9rem;">Original: ${originalSizeStr}</span>
                    </div>

                    <div class="file-controls-wrapper" style="display:flex; gap:15px; align-items:center; margin-bottom:10px;">
                        <div class="control-group" style="flex:0 0 120px;">
                            <label style="font-size:0.75rem; font-weight:600; margin-bottom:4px; display:block;">Format</label>
                            <select class="file-format-select" data-index="${index}" style="width:100%; padding:6px; font-size:0.9rem;">
                                <option value="image/avif" ${this.selectedFormat === 'image/avif' ? 'selected' : ''}>AVIF</option>
                                <option value="image/webp" ${this.selectedFormat === 'image/webp' ? 'selected' : ''}>WebP</option>
                                <option value="image/jpeg" ${this.selectedFormat === 'image/jpeg' ? 'selected' : ''}>JPEG</option>
                                <option value="image/png" ${this.selectedFormat === 'image/png' ? 'selected' : ''}>PNG</option>
                            </select>
                        </div>

                        <div class="control-group" style="flex:1;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                <label style="font-size:0.75rem; font-weight:600;">Quality</label>
                                <span class="quality-display" style="font-size:0.75rem;">80%</span>
                            </div>
                            <input type="range" class="file-quality" data-index="${index}" min="1" max="100" value="80" style="width:100%;">
                            <div class="estimated-size" style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                                Est. ~${formatBytes(file.size * 0.4)} (80%)
                            </div>
                        </div>
                    </div>

                    <div class="file-status" id="status-${index}" style="margin-bottom:10px;"></div>
                    
                    <div class="file-actions" style="display:flex; justify-content:flex-end; gap:10px;">
                         <button class="btn-primary file-convert-btn" data-index="${index}">Convert</button>
                    </div>
                </div>
            `;

            this.fileList.appendChild(fileItem);

            // Add Logic
            const slider = fileItem.querySelector('.file-quality');
            const qualityDisplay = fileItem.querySelector('.quality-display');
            const estimateEl = fileItem.querySelector('.estimated-size');
            const formatSelect = fileItem.querySelector('.file-format-select');

            const updateEstimate = () => {
                const q = parseInt(slider.value);
                const format = formatSelect.value;
                qualityDisplay.textContent = `${q}%`;

                // Estimation Logic (Same as app.js)
                let efficiencyFactor = 1.0;
                if (format === 'image/avif') efficiencyFactor = 0.6;
                else if (format === 'image/webp') efficiencyFactor = 0.7;
                else if (format === 'image/jpeg') efficiencyFactor = 0.8;
                else if (format === 'image/png') efficiencyFactor = 0.9;

                const qualityCurve = Math.pow(q / 100, 1.5);
                let estimatedBytes = file.size * qualityCurve * efficiencyFactor;

                if (q < 90 && estimatedBytes > file.size) {
                    estimatedBytes = file.size * 0.95;
                }

                estimateEl.textContent = `Est. ~${formatBytes(estimatedBytes)} (${q}%)`;
            };

            slider.addEventListener('input', updateEstimate);
            formatSelect.addEventListener('change', updateEstimate);

            // Trigger once to set initial value
            updateEstimate();

            // Add individual convert button listener
            const convertBtn = fileItem.querySelector('.file-convert-btn');
            convertBtn.addEventListener('click', () => {
                this.convertSingleFile(index);
            });
        });
    }

    async convertSingleFile(index) {
        const file = this.files[index];
        const statusDiv = document.getElementById(`status-${index}`);
        const convertBtn = document.querySelector(`.file-convert-btn[data-index="${index}"]`);

        // Get per-item settings
        const formatSelect = document.querySelector(`.file-format-select[data-index="${index}"]`);
        const qualityInput = document.querySelector(`.file-quality[data-index="${index}"]`);

        const format = formatSelect ? formatSelect.value : this.selectedFormat;
        const quality = qualityInput ? parseInt(qualityInput.value) : this.selectedQuality;

        statusDiv.innerHTML = '<span style="color: var(--primary-color);">Converting...</span>';
        convertBtn.disabled = true;

        try {
            let blob = await this.convertImage(file, format, quality);

            // Compression Safeguard
            let isSaved = true;
            if (blob.size >= file.size && format === file.type) {
                blob = file;
                isSaved = false;
            }

            const newSize = (blob.size / 1024).toFixed(2);
            // const originalSize = (file.size / 1024).toFixed(2);
            const reduction = (((file.size - blob.size) / file.size) * 100);

            let reductionStr;
            if (reduction > 0) reductionStr = `-${reduction.toFixed(1)}%`;
            else if (reduction === 0) reductionStr = `0%`;
            else reductionStr = `+${Math.abs(reduction).toFixed(1)}%`;

            const statusColor = isSaved ? 'var(--success-color)' : 'var(--text-muted)';
            const statusText = isSaved ? `✓ Done! New size: ${newSize} KB (${reductionStr})` : `Optimized (No reduction)`;

            if (!isSaved && format !== file.type) {
                statusDiv.innerHTML = `
                    <span style="color: var(--success-color); font-size: 0.85rem;">
                        ✓ Done! New size: ${newSize} KB (${reductionStr})
                    </span>
                `;
            } else {
                statusDiv.innerHTML = `
                    <span style="color: ${statusColor}; font-size: 0.85rem;">
                        ${statusText}
                    </span>
                `;
            }

            // Store converted blob with metadata
            this.files[index].convertedBlob = blob;
            this.files[index].converted = true;
            this.files[index].outputFormat = format;

            this.downloadBtn.classList.remove('hidden');
        } catch (error) {
            statusDiv.innerHTML = `<span style="color: var(--error-color);">Error: ${error.message}</span>`;
        }

        convertBtn.disabled = false;
    }

    async convertAll() {
        for (let i = 0; i < this.files.length; i++) {
            if (!this.files[i].converted) {
                await this.convertSingleFile(i);
            }
        }
    }

    async convertImage(file, format, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('Conversion failed'));
                            }
                        },
                        format,
                        quality / 100
                    );
                };

                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    async downloadAllAsZip() {
        const zip = new JSZip();
        // const folder = zip.folder('converted-images'); // Flat structure is usually better for users

        for (let i = 0; i < this.files.length; i++) {
            if (this.files[i].converted) {
                const usedFormat = this.files[i].outputFormat || this.selectedFormat;
                const formatExt = this.getFileExtension(usedFormat);
                const originalName = this.files[i].name;
                const nameWithoutExt = originalName.lastIndexOf('.') !== -1 ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
                const newFileName = `${nameWithoutExt}.${formatExt}`;

                zip.file(newFileName, this.files[i].convertedBlob);
            }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `converted-images-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    getFileExtension(mimeType) {
        const extensions = {
            'image/avif': 'avif',
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/webp': 'webp'
        };
        return extensions[mimeType] || 'jpg';
    }

    updateButtonText() {
        const formatName = {
            'image/avif': 'AVIF',
            'image/png': 'PNG',
            'image/jpeg': 'JPEG',
            'image/webp': 'WebP'
        };
        this.processBtn.textContent = `Convert to ${formatName[this.selectedFormat]}`;
    }

    clearAll() {
        this.files = [];
        this.fileList.innerHTML = '';
        this.fileList.classList.add('hidden');
        this.controls.classList.add('hidden');
        this.actionArea.classList.add('hidden');
        this.downloadBtn.classList.add('hidden');
        this.fileInput.value = '';
    }

    closePreviewModal() {
        this.previewModal.style.display = 'none';
    }

    toggleTheme() {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        const moonIcon = this.themeToggle.querySelector('.moon-icon');
        const sunIcon = this.themeToggle.querySelector('.sun-icon');

        if (newTheme === 'dark') {
            moonIcon.classList.add('hidden');
            sunIcon.classList.remove('hidden');
        } else {
            moonIcon.classList.remove('hidden');
            sunIcon.classList.add('hidden');
        }
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        const html = document.documentElement;
        html.setAttribute('data-theme', savedTheme);

        const moonIcon = this.themeToggle.querySelector('.moon-icon');
        const sunIcon = this.themeToggle.querySelector('.sun-icon');

        if (savedTheme === 'dark') {
            moonIcon.classList.add('hidden');
            sunIcon.classList.remove('hidden');
        }
    }
}

// Initialize the converter when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AVIFConverter();
});
