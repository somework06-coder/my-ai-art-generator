const express = require('express');
const puppeteer = require('puppeteer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cors = require('cors');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors()); // Allow cross-origin requests
app.use(express.json({ limit: '50mb' }));

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

app.get('/', (req, res) => res.send('Video Service OK'));

app.post('/export', async (req, res) => {
    let browser = null;
    let tempDir = '';

    try {
        const { shaderCode, aspectRatio = '16:9', quality = 'HD', duration = 5, fps = 30, format = 'mp4' } = req.body;

        if (!shaderCode) return res.status(400).json({ error: 'No shader code' });

        const { width, height } = getResolution(aspectRatio, quality);
        const totalFrames = Math.floor(duration * fps);
        console.log(`Exporting: ${width}x${height}, ${totalFrames} frames`);

        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'render-'));
        const framesDir = path.join(tempDir, 'frames');
        fs.mkdirSync(framesDir);

        browser = await puppeteer.launch({
            headless: 'shell',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist']
        });

        const page = await browser.newPage();
        await page.setViewport({ width, height });

        // Load HTML via Data URI
        await page.setContent(RENDER_HTML);

        // Init
        await page.evaluate((code, w, h) => window.initShader(w, h, code), shaderCode, width, height);
        await page.waitForFunction('window.isReady === true');

        // Capture
        for (let i = 0; i < totalFrames; i++) {
            await page.evaluate((t) => window.renderFrame(t), i / fps);
            await page.screenshot({ path: path.join(framesDir, `frame_${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
        }

        await browser.close();
        browser = null;

        // Encode
        // Standardize output to H.264 for both MP4 and MOV to ensure consistent file size.
        // Use CRF 14 for 4K (High Quality), 16 for FHD, 18 for HD.
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

        res.download(output, `video.${format}`, () => {
            fs.rmSync(tempDir, { recursive: true, force: true });
        });

    } catch (err) {
        console.error(err);
        if (browser) browser.close();
        if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
        res.status(500).json({ error: 'Export failed' });
    }
});

app.listen(PORT, () => console.log(`Service running on ${PORT}`));
