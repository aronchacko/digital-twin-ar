import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

// --- MediaPipe Setup ---
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const statusText = document.getElementById('system-status');

let currentPoseLandmarks = null;
let currentFaceLandmarks = null;

function onResults(results) {
    // Draw debug
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00f0ff', lineWidth: 2});
        drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#ffffff', lineWidth: 1, radius: 2});
    }
    if (results.faceLandmarks) {
        drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {color: '#ffffff', lineWidth: 0.5});
    }
    canvasCtx.restore();

    // Store for Three.js
    if (results.poseLandmarks || results.faceLandmarks) {
        currentPoseLandmarks = results.poseLandmarks || null;
        currentFaceLandmarks = results.faceLandmarks || null;
        statusText.innerText = "DIGITAL TWIN SYNCED";
        statusText.style.color = "#00f0ff";
    } else {
        currentPoseLandmarks = null;
        currentFaceLandmarks = null;
        statusText.innerText = "SEARCHING FOR HOST...";
        statusText.style.color = "#ffaa00";
    }
}

const holistic = new Holistic({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
}});

holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    refineFaceLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

holistic.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await holistic.send({image: videoElement});
    },
    width: 640,
    height: 480
});
camera.start();

// --- Three.js Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

const tCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
tCamera.position.z = 2.5;
tCamera.position.y = 1;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
container.appendChild(renderer.domElement);

// Hide the default Three.js AR button which forces itself visible asynchronously
const hiddenDiv = document.createElement('div');
hiddenDiv.style.display = 'none';
document.body.appendChild(hiddenDiv);

const arBtn = ARButton.createButton(renderer);
hiddenDiv.appendChild(arBtn);

const customArBtn = document.getElementById('ar-button');
if (customArBtn) {
    customArBtn.style.display = "block";
    customArBtn.addEventListener('click', () => { arBtn.click(); });
}


// --- Particle System ---
const particleCount = 30000; // Reduced from 50k to fix lag and improve framerate
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);

// Assign particles to roles
const particleData = [];
for (let i = 0; i < particleCount; i++) {
    // 20% face, 65% body, 15% permanent background ambient particles
    const randType = Math.random();
    let type;
    if (randType < 0.2) type = 'face';
    else if (randType < 0.85) type = 'body';
    else type = 'background';
    
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10 + 1;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;

    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos((Math.random() * 2) - 1);
    
    // Distribution favoring the center of the bone for a solid core
    const randR = (Math.random() + Math.random() + Math.random()) / 3; 
    
    const bodyPart = type === 'body' ? Math.floor(Math.random() * 10) : -1;

    // Massively increased radii so limbs form thick volumes that intersect
    let maxRadius = 0.03; // Face
    if (type === 'body') {
        if (bodyPart === 0) maxRadius = 0.35; // Torso
        else if (bodyPart === 5 || bodyPart === 7) maxRadius = 0.25; // Thighs
        else if (bodyPart === 6 || bodyPart === 8) maxRadius = 0.18; // Calves
        else if (bodyPart === 1 || bodyPart === 3) maxRadius = 0.18; // Upper arms
        else if (bodyPart === 2 || bodyPart === 4) maxRadius = 0.12; // Forearms
        else if (bodyPart === 9) maxRadius = 0.25; // Neck/Shoulder bridge
    } else if (type === 'background') {
        maxRadius = 5.0; // Huge radius for background
    }

    const r = randR * maxRadius;
    
    // Use full spherical offsets for everything so limbs are thick in all 3 dimensions
    particleData.push({ 
        type: type, 
        bodyPart: bodyPart,
        t1: Math.random(), 
        t2: Math.random(), 
        offsetX: type === 'background' ? 0 : r * Math.sin(phi) * Math.cos(theta),
        offsetY: type === 'background' ? 0 : r * Math.sin(phi) * Math.sin(theta),
        offsetZ: type === 'background' ? 0 : r * Math.cos(phi)
    });
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

// Generate glowing cyan texture
const circleCanvas = document.createElement('canvas');
circleCanvas.width = 32;
circleCanvas.height = 32;
const context = circleCanvas.getContext('2d');
const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
gradient.addColorStop(0, 'rgba(255,255,255,1)');
gradient.addColorStop(0.2, 'rgba(0,240,255,1)');
gradient.addColorStop(0.5, 'rgba(0,240,255,0.2)');
gradient.addColorStop(1, 'rgba(0,0,0,0)');
context.fillStyle = gradient;
context.fillRect(0, 0, 32, 32);
const particleTexture = new THREE.CanvasTexture(circleCanvas);

const material = new THREE.PointsMaterial({
    color: 0xffffff, // Tint is applied via the canvas gradient
    size: 0.05,      // Optimal size for high density
    map: particleTexture,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
});

const particleSystem = new THREE.Points(geometry, material);
particleSystem.position.set(0, 0, -2); // Center in AR
scene.add(particleSystem);

// Body skeleton definitions
// Limbs: continuous line segments
const limbs = [
    [11, 13, 15], // Left Arm (Shoulder -> Elbow -> Wrist)
    [12, 14, 16], // Right Arm
    [23, 25, 27], // Left Leg
    [24, 26, 28]  // Right Leg
];

// Torso points: Left Shoulder(11), Right Shoulder(12), Left Hip(23), Right Hip(24)

window.addEventListener('resize', () => {
    tCamera.aspect = window.innerWidth / window.innerHeight;
    tCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

renderer.setAnimationLoop(render);

function render() {
    const posAttr = geometry.attributes.position;
    const time = performance.now() * 0.001;
    const hasData = currentPoseLandmarks || currentFaceLandmarks;

    for (let i = 0; i < particleCount; i++) {
        let targetX, targetY, targetZ;
        const pData = particleData[i];
        
        if (pData.type === 'background' || !hasData) {
            // Ambient Swarm Logic: Background particles ALWAYS orbit, others orbit only if no human is detected
            const r = 5.0;
            const noise = Math.sin(time * 0.5 + pData.t1 * 100);
            targetX = Math.sin(time * 0.1 + pData.t1 * 50) * r * Math.sin(pData.t1 * Math.PI) + noise * 0.5;
            targetY = Math.cos(time * 0.05 + pData.t1 * 30) * r + 1.0;
            targetZ = Math.cos(time * 0.1 + pData.t1 * 50) * r * Math.cos(pData.t1 * Math.PI) + noise * 0.5;
        } else {
            const scale = 2.5; 
            const yOffset = 1.0;
            
            if (pData.type === 'face' && currentFaceLandmarks) {
                const idx = Math.floor(pData.t1 * currentFaceLandmarks.length);
                const lm = currentFaceLandmarks[idx];
                
                targetX = (lm.x - 0.5) * -scale + pData.offsetX;
                targetY = (lm.y - 0.5) * -scale + yOffset + pData.offsetY;
                targetZ = lm.z * scale + pData.offsetZ;
                
            } else if (pData.type === 'body' && currentPoseLandmarks) {
                let bx, by, bz;
                
                if (pData.bodyPart === 0) {
                    // Torso (Bilinear interpolation between shoulders and hips)
                    const ls = currentPoseLandmarks[11];
                    const rs = currentPoseLandmarks[12];
                    const lh = currentPoseLandmarks[23];
                    const rh = currentPoseLandmarks[24];
                    
                    if (ls && rs && lh && rh) {
                        const topX = ls.x + (rs.x - ls.x) * pData.t1;
                        const topY = ls.y + (rs.y - ls.y) * pData.t1;
                        const topZ = ls.z + (rs.z - ls.z) * pData.t1;
                        
                        const botX = lh.x + (rh.x - lh.x) * pData.t1;
                        const botY = lh.y + (rh.y - lh.y) * pData.t1;
                        const botZ = lh.z + (rh.z - lh.z) * pData.t1;
                        
                        bx = topX + (botX - topX) * pData.t2;
                        by = topY + (botY - topY) * pData.t2;
                        bz = topZ + (botZ - topZ) * pData.t2;
                        
                        targetX = (bx - 0.5) * -scale + pData.offsetX;
                        targetY = (by - 0.5) * -scale + yOffset + pData.offsetY; 
                        targetZ = bz * scale + pData.offsetZ;
                    } else {
                        targetX = posAttr.getX(i); targetY = posAttr.getY(i); targetZ = posAttr.getZ(i);
                    }
                } else if (pData.bodyPart === 9) {
                    // Neck/Shoulder bridge
                    const ls = currentPoseLandmarks[11];
                    const rs = currentPoseLandmarks[12];
                    const nose = currentPoseLandmarks[0];
                    if (ls && rs && nose) {
                        const cx = (ls.x + rs.x) / 2;
                        const cy = (ls.y + rs.y) / 2;
                        const cz = (ls.z + rs.z) / 2;
                        bx = cx + (nose.x - cx) * pData.t1;
                        by = cy + (nose.y - cy) * pData.t1;
                        bz = cz + (nose.z - cz) * pData.t1;
                        
                        targetX = (bx - 0.5) * -scale + pData.offsetX;
                        targetY = (by - 0.5) * -scale + yOffset + pData.offsetY;
                        targetZ = bz * scale + pData.offsetZ;
                    } else {
                        targetX = posAttr.getX(i); targetY = posAttr.getY(i); targetZ = posAttr.getZ(i);
                    }
                } else {
                    // Limbs
                    let p1, p2;
                    if (pData.bodyPart === 1) { p1 = 11; p2 = 13; } // L upper arm
                    else if (pData.bodyPart === 2) { p1 = 13; p2 = 15; } // L forearm
                    else if (pData.bodyPart === 3) { p1 = 12; p2 = 14; } // R upper arm
                    else if (pData.bodyPart === 4) { p1 = 14; p2 = 16; } // R forearm
                    else if (pData.bodyPart === 5) { p1 = 23; p2 = 25; } // L thigh
                    else if (pData.bodyPart === 6) { p1 = 25; p2 = 27; } // L calf
                    else if (pData.bodyPart === 7) { p1 = 24; p2 = 26; } // R thigh
                    else if (pData.bodyPart === 8) { p1 = 26; p2 = 28; } // R calf

                    const lm1 = currentPoseLandmarks[p1];
                    const lm2 = currentPoseLandmarks[p2];
                    
                    if (lm1 && lm2) {
                        const taper = 1.0 - (pData.t1 * 0.3);
                        
                        bx = lm1.x + (lm2.x - lm1.x) * pData.t1;
                        by = lm1.y + (lm2.y - lm1.y) * pData.t1;
                        bz = lm1.z + (lm2.z - lm1.z) * pData.t1;
                        
                        targetX = (bx - 0.5) * -scale + (pData.offsetX * taper);
                        targetY = (by - 0.5) * -scale + yOffset + (pData.offsetY * taper); 
                        targetZ = bz * scale + (pData.offsetZ * taper);
                    } else {
                        targetX = posAttr.getX(i); targetY = posAttr.getY(i); targetZ = posAttr.getZ(i);
                    }
                }
            } else {
                targetX = posAttr.getX(i); targetY = posAttr.getY(i); targetZ = posAttr.getZ(i);
            }
        }
        
        const cx = posAttr.getX(i);
        const cy = posAttr.getY(i);
        const cz = posAttr.getZ(i);
        
        // Very fast snap for face, slower for ambient
        const lerpSpeed = hasData ? 0.3 : 0.01;

        posAttr.setXYZ(
            i,
            cx + (targetX - cx) * lerpSpeed,
            cy + (targetY - cy) * lerpSpeed,
            cz + (targetZ - cz) * lerpSpeed
        );
    }
    
    posAttr.needsUpdate = true;
    renderer.render(scene, tCamera);
}
