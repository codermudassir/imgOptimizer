// processor.worker.js
// Runs entirely off-thread: decodes the source image, optionally resizes it,
// then re-encodes to the requested format/quality. Nothing here ever touches
// the network — nothing here even has access to it.
//
// IMPORTANT — what "quality" means here:
// The slider is framed as "how much smaller than the original", per file.
// A flat encoder-quality value (e.g. 0.8) does NOT produce a consistent size
// cut across different images — a flat photo compresses far more than a
// busy one at the same quality setting. So instead of passing the slider
// straight to convertToBlob, we treat it as a TARGET SIZE (originalSize *
// (1 - reduction%)) and binary-search the encoder's quality parameter until
// the actual output lands close to that target. This makes the same slider
// position cut roughly the same percentage off every file, regardless of
// its content — which is the behavior being asked for.

const MAX_SEARCH_STEPS = 7;       // encoder calls per image; cheap, runs off-thread
const SIZE_TOLERANCE = 0.04;      // accept within ±4% of the target size

self.onmessage = async function (e) {
    const { id, file, settings } = e.data;

    try {
        const bitmap = await createImageBitmap(file);

        let width = bitmap.width;
        let height = bitmap.height;

        // Resize logic (aspect-ratio aware when only one dimension is set)
        if (settings.targetWidth && settings.targetHeight) {
            width = settings.targetWidth;
            height = settings.targetHeight;
        } else if (settings.targetWidth) {
            const ratio = bitmap.height / bitmap.width;
            width = settings.targetWidth;
            height = Math.round(width * ratio);
        } else if (settings.targetHeight) {
            const ratio = bitmap.width / bitmap.height;
            height = settings.targetHeight;
            width = Math.round(height * ratio);
        }

        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, width, height);

        const isLossy = settings.format === 'image/jpeg' || settings.format === 'image/webp';
        let blob;

        if (isLossy) {
            // settings.quality arrives as a 0–1 "keep this much of the original
            // size" target, e.g. 0.8 means "aim for ~80% of the original bytes".
            const targetBytes = file.size * settings.quality;
            blob = await encodeToTargetSize(canvas, settings.format, targetBytes);
        } else {
            // PNG is lossless — there is no quality lever, so the slider
            // legitimately does nothing here beyond the resize already applied.
            blob = await canvas.convertToBlob({ type: settings.format });
        }

        self.postMessage({ id, success: true, blob, width, height });
    } catch (error) {
        self.postMessage({ id, success: false, error: error.message });
    }
};

// Binary-searches the encoder's 0–1 quality parameter so the resulting blob
// lands close to targetBytes. Falls back to the closest attempt seen if the
// tolerance band is never hit within the step budget.
async function encodeToTargetSize(canvas, mimeType, targetBytes) {
    let lo = 0.02;
    let hi = 0.97;
    let best = null;

    for (let i = 0; i < MAX_SEARCH_STEPS; i++) {
        const mid = (lo + hi) / 2;
        const candidate = await canvas.convertToBlob({ type: mimeType, quality: mid });

        if (!best || Math.abs(candidate.size - targetBytes) < Math.abs(best.size - targetBytes)) {
            best = candidate;
        }

        const ratio = candidate.size / targetBytes;
        if (Math.abs(ratio - 1) <= SIZE_TOLERANCE) {
            return candidate;
        }

        if (candidate.size > targetBytes) {
            hi = mid; // too big — push quality down
        } else {
            lo = mid; // too small — there's room to push quality up
        }
    }

    return best;
}