
require('dotenv').config();
const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cors = require('cors');
const { Worker } = require('bullmq');
const { createClient } = require('@supabase/supabase-js');
const Redis = require('ioredis');
const puppeteer = require('puppeteer');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors()); // Allow cross-origin requests
app.use(express.json({ limit: '50mb' }));

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn("⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Uploads will fail.");
}

// Redis Setup
const redisUrl = process.env.REDIS_URL;
let connection = null;

if (redisUrl) {
    connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    console.log(`✅ Connected to Redis at ${redisUrl}`);
} else {
    console.warn("⚠️ REDIS_URL missing. Worker will not start.");
}

function getResolution(aspectRatio, quality) {
    let baseWidth, baseHeight;
    switch (aspectRatio) {
        case '16:9': baseWidth = 1280; baseHeight = 720; break;
        case '9:16': baseWidth = 720; baseHeight = 1280; break;
        case '1:1': baseWidth = 720; baseHeight = 720; break;
        default: baseWidth = 1280; baseHeight = 720;
    }
    let scale = 1;
    if (quality === 'FHD') scale = 1.5;
    if (quality === '4K') scale = 3;
    return { width: Math.round(baseWidth * scale), height: Math.round(baseHeight * scale) };
}

// Minimal HTML for Rendering (Injected)
const RENDER_HTML = `
<!DOCTYPE html>
<html>
<head><style>body{margin:0;overflow:hidden;}</style></head>
<body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
    let renderer, scene, camera, uniforms;
    window.initShader = function(w, h, fragCode) {
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        scene = new THREE.Scene();
        const geometry = new THREE.PlaneGeometry(2, 2);
        uniforms = { uTime: { value: 0 }, uResolution: { value: new THREE.Vector2(w, h) } };
        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            fragmentShader: fragCode,
            vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }'
        });
        scene.add(new THREE.Mesh(geometry, material));
        renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
        renderer.setSize(w, h);
        document.body.appendChild(renderer.domElement);
        window.isReady = true;
    };
    window.renderFrame = function(t) {
        if (uniforms) uniforms.uTime.value = t;
        if (renderer) renderer.render(scene, camera);
    };
</script>
</body>
</html>`;

async function processVideoExport(jobId, data) {
    let browser = null;
    let tempDir = '';

    try {
        const { shaderCode, aspectRatio = '16:9', quality = 'HD', duration = 5, fps = 30, format = 'mp4' } = data;

        if (!shaderCode) throw new Error('No shader code provided');

        const { width, height } = getResolution(aspectRatio, quality);
        const totalFrames = Math.floor(duration * fps);
        console.log(`[Job ${jobId}] Starting Export: ${width}x${height}, ${totalFrames} frames`);

        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `render-${jobId}-`));
        const framesDir = path.join(tempDir, 'frames');
        fs.mkdirSync(framesDir);

        // Stronger detection for Linux / Railway
        const isLinuxOrProd = process.platform === 'linux' || process.env.RAILWAY_ENVIRONMENT === 'true' || process.env.NODE_ENV === 'production';

        const browserArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--enable-webgl',
            '--ignore-gpu-blocklist'
        ];

        if (isLinuxOrProd) {
            // Railway/Linux requires software rendering flags and headless mode
            browserArgs.push('--disable-gpu', '--use-gl=angle', '--use-angle=swiftshader');
        }

        browser = await puppeteer.launch({
            // Force true for linux/railway, false for local Mac development
            headless: isLinuxOrProd ? true : false,
            args: browserArgs
        });

        const page = await browser.newPage();
        await page.setViewport({ width, height });
        await page.setContent(RENDER_HTML);
        await page.evaluate((code, w, h) => window.initShader(w, h, code), shaderCode, width, height);
        await page.waitForFunction('window.isReady === true');

        for (let i = 0; i < totalFrames; i++) {
            await page.evaluate((t) => window.renderFrame(t), i / fps);
            await page.screenshot({ path: path.join(framesDir, `frame_${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
        }

        await browser.close();
        browser = null;

        const output = path.join(tempDir, `output.${format}`);
        let crf = 18;
        if (quality === '4K') crf = 14;
        if (quality === 'FHD') crf = 16;

        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(path.join(framesDir, 'frame_%05d.jpg'))
                .inputFPS(fps)
                .output(output)
                .videoCodec('libx264')
                .outputOptions(['-pix_fmt yuv420p', `-crf ${crf}`, '-preset fast', '-movflags +faststart'])
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        console.log(`[Job ${jobId}] Video encoded successfully.`);

        // Bypass Supabase Storage entirely - Proxy Delivery
        const publicExportsDir = path.join(__dirname, 'public_exports');
        if (!fs.existsSync(publicExportsDir)) {
            fs.mkdirSync(publicExportsDir, { recursive: true });
        }

        const fileName = `${jobId}.${format}`;
        const finalOutputPath = path.join(publicExportsDir, fileName);

        fs.copyFileSync(output, finalOutputPath);
        console.log(`[Job ${jobId}] Saved locally to: ${finalOutputPath}`);

        const domain = process.env.RAILWAY_PUBLIC_DOMAIN
            ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
            : `http://localhost:${PORT}`;

        const videoUrl = `${domain}/download/${fileName}`;
        console.log(`[Job ${jobId}] Proxy URL Ready: ${videoUrl}`);

        // Clean up
        fs.rmSync(tempDir, { recursive: true, force: true });

        return { success: true, videoUrl };

    } catch (err) {
        console.error(`[Job ${jobId}] Failed:`, err);
        if (browser) browser.close();
        if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
        throw err;
    }
}


// --- HTTP Server (Legacy / Health Check / Downloads) ---
app.get('/', (req, res) => res.send('Video Service Worker Running.'));

app.get('/health', async (req, res) => {
    const redisStatus = connection && connection.status === 'ready' ? 'connected' : 'disconnected';
    res.json({ status: 'ok', redis: redisStatus });
});

// Proxy Download Endpoint (Bypasses Supabase Storage)
// This serves the video and then IMMEDIATELY deletes it from disk to save space.
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    // Prevent directory traversal attacks
    if (filename.includes('/') || filename.includes('..')) {
        return res.status(400).send('Invalid filename');
    }

    const filePath = path.join(__dirname, 'public_exports', filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found or already downloaded/deleted.');
    }

    res.download(filePath, filename, (err) => {
        if (err) {
            console.error(`[Download Error] serving ${filename}:`, err);
        } else {
            console.log(`[Auto-Cleanup] Download complete. Deleting ${filename} from worker disk.`);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (unlinkErr) {
                console.error(`Failed to delete ${filename}:`, unlinkErr);
            }
        }
    });
});

// Allow direct HTTP export (optional, useful for testing without queue)
app.post('/export', async (req, res) => {
    try {
        const result = await processVideoExport('http-' + Date.now(), req.body);
        // Direct download not supported via this route anymore if uploading to S3, but for compatibility:
        // We can't stream the file if we deleted it.
        // So for HTTP legacy support, we might need adjustments.
        // For simplicity, let's keep the logic simple: direct export uploads to storage if configured, OR errors out.
        if (result.videoUrl) {
            res.json({ url: result.videoUrl });
        } else {
            res.status(500).json({ error: 'Supabase storage not configured, cannot return URL via HTTP.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`HTTP Service running on ${PORT}`));


// --- BullMQ Worker ---
if (connection) {
    const worker = new Worker('video-export', async (job) => {
        console.log(`[Queue] Processing job ${job.id}...`);

        // 1. Update Job Status to Processing (Optional, if we want granular UI updates via Supabase)
        if (supabase && job.data.jobDbId) {
            await supabase.from('export_jobs')
                .update({ status: 'processing' })
                .eq('id', job.data.jobDbId);
        }

        // 2. Process Video
        const result = await processVideoExport(job.id, job.data);

        // 3. Update Job Status to Completed
        if (supabase && job.data.jobDbId) {
            await supabase.from('export_jobs')
                .update({
                    status: 'completed',
                    video_url: result.videoUrl
                })
                .eq('id', job.data.jobDbId);
        }

        return result;

    }, { connection });

    worker.on('completed', (job) => {
        console.log(`[Queue] Job ${job.id} completed!`);
    });

    worker.on('failed', async (job, err) => {
        console.error(`[Queue] Job ${job.id} failed: ${err.message}`);
        if (supabase && job.data.jobDbId) {
            await supabase.from('export_jobs')
                .update({
                    status: 'failed',
                    error_msg: err.message
                })
                .eq('id', job.data.jobDbId);
        }
    });

    console.log("👷 Queue Worker Started!");
}
