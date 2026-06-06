
// PARTICLE SYSTEM EXPLORER
// Mathematical curves visualized in 3D space


// Scene setup
let scene, camera, renderer;
let particles = [];
let particleCount = 100;
let time = 0;

// Audio context
let audioContext;
let oscillators = [];
let gainNode;

// Parameters for GUI controls
const params = {
    curveType: 'lissajous',
    particleCount: 100,
    speed: 1.0,
    trailLength: 50,
    particleSize: 0.1,
    color: '#4fc3f7',
    audioEnabled: true,
    audioVolume: 0.05,  
    reset: function() {
        createParticles();
    }
};

// Curve types with their parametric equations
const curves = {
    lissajous: (t, i) => {
        const A = 5, B = 5, C = 3;
        const a = 3, b = 2, c = 1;
        const delta = i * 0.1;
        return {
            x: A * Math.sin(a * t + delta),
            y: B * Math.sin(b * t),
            z: C * Math.sin(c * t)
        };
    },
    
    helix: (t, i) => {
        const radius = 3 + i * 0.05;
        const height = 0.3;
        const wrapped_t = t % 40;  // Loop it so it doesn't fly away!
        return {
            x: radius * Math.cos(wrapped_t + i * 0.1),
            y: height * wrapped_t - 6,  // Center it
            z: radius * Math.sin(wrapped_t + i * 0.1)
        };
    },
    
    spiral: (t, i) => {
        const growth = 0.1;
        const r = growth * t;
        return {
            x: r * Math.cos(t + i * 0.2),
            y: r * Math.sin(t + i * 0.2),
            z: t * 0.2 - 5
        };
    },
    
    torusKnot: (t, i) => {
        const p = 2, q = 3;
        const r = 3 + Math.cos(q * t);
        return {
            x: r * Math.cos(p * t),
            y: r * Math.sin(p * t),
            z: -Math.sin(q * t) * 2
        };
    },
    
    rose: (t, i) => {
        const k = 5;
        const r = 3 * Math.cos(k * t);
        return {
            x: r * Math.cos(t),
            y: r * Math.sin(t),
            z: Math.sin(3 * t) * 2
        };
    },
    
    // CUSTOM CURVE 1: Wave pattern
    wave: (t, i) => {
        const spread = i * 0.3 - 15;
        return {
            x: spread,
            y: 4 * Math.sin(t * 2 + spread * 0.3),
            z: 4 * Math.cos(t * 2 + spread * 0.3)
        };
    },
    
    // CUSTOM CURVE 2: Tornado
    tornado: (t, i) => {
        const height = i * 0.15 - 8;
        const radius = 5 - Math.abs(height) * 0.3;
        const spin = t * 2 + height * 0.5;
        return {
            x: radius * Math.cos(spin),
            y: height,
            z: radius * Math.sin(spin)
        };
    },
    
    // CUSTOM CURVE 3: Flower
    flower: (t, i) => {
        const petals = 6;
        const angle = (i / params.particleCount) * Math.PI * 2;
        const radius = 3 + 2 * Math.sin(petals * angle);
        return {
            x: radius * Math.cos(angle + t * 0.5),
            y: Math.sin(t * 3 + i * 0.1) * 2,
            z: radius * Math.sin(angle + t * 0.5)
        };
    },
    
    // CUSTOM CURVE 4: DNA Helix
    dnaHelix: (t, i) => {
        const strand = Math.floor(i / (params.particleCount / 2));
        const offset = strand * Math.PI;
        const height = (i % (params.particleCount / 2)) * 0.2 - 5;
        return {
            x: 3 * Math.cos(height * 2 + t + offset),
            y: height,
            z: 3 * Math.sin(height * 2 + t + offset)
        };
    },
    
    // CUSTOM CURVE 5: Sphere expanding
    expandingSphere: (t, i) => {
        const phi = Math.acos(-1 + (2 * i) / params.particleCount);
        const theta = Math.sqrt(params.particleCount * Math.PI) * phi;
        const radius = 3 + Math.sin(t) * 2;
        return {
            x: radius * Math.cos(theta) * Math.sin(phi),
            y: radius * Math.sin(theta) * Math.sin(phi),
            z: radius * Math.cos(phi)
        };
    }
};


// INITIALIZATION


function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);
    
    // Additional lights for better visuals
    const pointLight2 = new THREE.PointLight(0x4fc3f7, 0.5, 100);
    pointLight2.position.set(-10, -10, -10);
    scene.add(pointLight2);

    // Create initial particles
    createParticles();

    // Setup GUI controls
    setupGUI();

    // Setup audio
    setupAudio();

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}


// PARTICLE SYSTEM


function createParticles() {
    // Clear existing particles
    particles.forEach(p => {
        scene.remove(p.mesh);
        if (p.trail) scene.remove(p.trail);
    });
    particles = [];

    particleCount = params.particleCount;

    for (let i = 0; i < particleCount; i++) {
        // Particle geometry
        const geometry = new THREE.SphereGeometry(params.particleSize, 8, 8);
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(params.color),
            emissive: new THREE.Color(params.color),
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // Trail line
        const trailGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(params.trailLength * 3);
        trailGeometry.setAttribute('position', 
            new THREE.BufferAttribute(positions, 3)
        );

        const trailMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(params.color),
            transparent: true,
            opacity: 0.3
        });

        const trail = new THREE.Line(trailGeometry, trailMaterial);
        scene.add(trail);

        particles.push({
            mesh: mesh,
            trail: trail,
            trailPositions: [],
            phase: i / particleCount
        });
    }
}


// ANIMATION


function animate() {
    requestAnimationFrame(animate);

    time += 0.01 * params.speed;

    // Update particles
    particles.forEach((particle, i) => {
        const t = time + particle.phase * Math.PI * 2;
        
        // Get position from current curve
        const curveFunc = curves[params.curveType];
        const pos = curveFunc(t, i);

        // Update mesh position
        particle.mesh.position.set(pos.x, pos.y, pos.z);

        // Update trail
        particle.trailPositions.push(pos.x, pos.y, pos.z);
        
        // Keep trail at specified length
        if (particle.trailPositions.length > params.trailLength * 3) {
            particle.trailPositions.splice(0, 3);
        }

        // Update trail geometry
        const positions = particle.trail.geometry.attributes.position.array;
        for (let j = 0; j < particle.trailPositions.length; j++) {
            positions[j] = particle.trailPositions[j];
        }
        particle.trail.geometry.attributes.position.needsUpdate = true;
    });

    // Update audio based on particle positions
    updateAudio();

    // Camera orbit
    const radius = 15;
    camera.position.x = radius * Math.sin(time * 0.1);
    camera.position.z = radius * Math.cos(time * 0.1);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}


// AUDIO SYSTEM 


function setupAudio() {
    // Initialize Web Audio API on user interaction
    document.addEventListener('click', initAudio, { once: true });
}

function initAudio() {
    if (audioContext) return;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Master gain - MUCH QUIETER!
    gainNode = audioContext.createGain();
    gainNode.gain.value = params.audioEnabled ? params.audioVolume : 0;
    gainNode.connect(audioContext.destination);

    // Create oscillators for particles - SOFTER SOUNDS!
    for (let i = 0; i < 5; i++) {
        const osc = audioContext.createOscillator();
        osc.type = 'sine';  // Sine wave is softest
        osc.frequency.value = 150 + i * 80;  // Lower frequencies
        
        const oscGain = audioContext.createGain();
        oscGain.gain.value = 0.1;  // Much quieter
        
        osc.connect(oscGain);
        oscGain.connect(gainNode);
        osc.start();
        
        oscillators.push({ osc, gain: oscGain });
    }
}

function updateAudio() {
    if (!audioContext || !params.audioEnabled) return;

    // Modulate frequencies based on particle positions - GENTLER
    particles.forEach((particle, i) => {
        if (i < oscillators.length) {
            const speed = particle.mesh.position.length();
            const freq = 150 + speed * 20 + i * 40;  // Lower range
            oscillators[i].osc.frequency.setTargetAtTime(
                freq,
                audioContext.currentTime,
                0.3  // Slower changes
            );
        }
    });

    // Master volume based on average particle activity - QUIETER
    const avgSpeed = particles.reduce((sum, p) => 
        sum + p.mesh.position.length(), 0
    ) / particles.length;
    
    const targetVolume = params.audioEnabled ? 
        Math.min(params.audioVolume, avgSpeed * 0.005) : 0;  // Much quieter
    
    gainNode.gain.setTargetAtTime(
        targetVolume,
        audioContext.currentTime,
        0.5  // Smooth transitions
    );
}


// GUI CONTROLS


function setupGUI() {
    const gui = new dat.GUI();

    gui.add(params, 'curveType', [
        'lissajous',
        'helix', 
        'spiral',
        'torusKnot',
        'rose',
        'wave',
        'tornado',
        'flower',
        'dnaHelix',
        'expandingSphere'
    ]).name('Curve Type').onChange(() => {
        updateParticleColors();
    });

    gui.add(params, 'particleCount', 10, 300, 1)
        .name('Particle Count')
        .onChange(() => createParticles());

    gui.add(params, 'speed', 0.1, 5.0, 0.1).name('Speed');

    gui.add(params, 'trailLength', 10, 200, 1)
        .name('Trail Length')
        .onChange(() => createParticles());

    gui.add(params, 'particleSize', 0.05, 0.5, 0.05)
        .name('Particle Size')
        .onChange(updateParticleSize);

    gui.addColor(params, 'color')
        .name('Color')
        .onChange(updateParticleColors);

    gui.add(params, 'audioEnabled').name('Audio On/Off').onChange((val) => {
        if (gainNode) {
            gainNode.gain.setTargetAtTime(
                val ? params.audioVolume : 0,
                audioContext.currentTime,
                0.1
            );
        }
    });
    
    gui.add(params, 'audioVolume', 0, 0.3, 0.01)
        .name('Audio Volume')
        .onChange((val) => {
            if (gainNode && params.audioEnabled) {
                gainNode.gain.setTargetAtTime(val, audioContext.currentTime, 0.1);
            }
        });

    gui.add(params, 'reset').name('Reset');
}

function updateParticleColors() {
    const color = new THREE.Color(params.color);
    particles.forEach(p => {
        p.mesh.material.color = color;
        p.mesh.material.emissive = color;
        p.trail.material.color = color;
    });
}

function updateParticleSize() {
    particles.forEach(p => {
        p.mesh.geometry.dispose();
        p.mesh.geometry = new THREE.SphereGeometry(params.particleSize, 8, 8);
    });
}


// WINDOW RESIZE


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


// START


init();
animate();

console.log('🎨 Particle System Explorer initialized!');
console.log('Click anywhere to enable audio (now much quieter!)');
console.log('Available curves: lissajous, helix, spiral, torusKnot, rose, wave, tornado, flower, dnaHelix, expandingSphere');
