// worker.js

self.onmessage = async function (e) {
    const { id, file, settings } = e.data;

    try {
        const bitmap = await createImageBitmap(file);

        let width = bitmap.width;
        let height = bitmap.height;

        // Resize logic
        if (settings.targetWidth && settings.targetHeight) {
            width = settings.targetWidth;
            height = settings.targetHeight;
        } else if (settings.targetWidth) {
            // Maintain aspect ratio
            const ratio = bitmap.height / bitmap.width;
            width = settings.targetWidth;
            height = width * ratio;
        } else if (settings.targetHeight) {
            // Maintain aspect ratio
            const ratio = bitmap.width / bitmap.height;
            height = settings.targetHeight;
            width = height * ratio;
        }

        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(bitmap, 0, 0, width, height);

        const blob = await canvas.convertToBlob({
            type: settings.format,
            quality: settings.quality
        });

        self.postMessage({ id, success: true, blob });
    } catch (error) {
        self.postMessage({ id, success: false, error: error.message });
    }
};
