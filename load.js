import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio * 0.5);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const vertexShader = `
varying vec3 vWorldPosition;
void main() {
	vWorldPosition = position;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const ambienceSettings = {
	morning: {
		sky: {
			skyColor: "vec3(0.85, 0.85, 0.9)",
			horizonColor: "vec3(1.0, 0.8, 0.4)",
			groundColor: "vec3(0.9, 0.8, 0.4)",
		},
		lighting: {
			ambientColor: 0xaad3ff,
			ambientIntensity: 0.4,
			sunColor: 0xffb24c,
			sunIntensity: 4.0,
			sunPosition: new THREE.Vector3(100, 20, 20),
		},
		fog: {
			color: 0xffcc66,
			near: 150,
			far: 200,
		},
	},
	midday: {
		sky: {
			skyColor: "vec3(0.75, 0.85, 0.9)",
			horizonColor: "vec3(0.9, 0.9, 0.9)",
			groundColor: "vec3(0.9, 0.9, 0.9)",
		},
		lighting: {
			ambientColor: 0xffffff,
			ambientIntensity: 0.4,
			sunColor: 0xfffffa,
			sunIntensity: 4.0,
			sunPosition: new THREE.Vector3(20, 100, 20),
		},
		fog: {
			color: 0xe5e5e5,
			near: 150,
			far: 200,
		},
	},
	afternoon: {
		sky: {
			skyColor: "vec3(0.85, 0.75, 0.8)",
			horizonColor: "vec3(0.8, 0.6, 0.4)",
			groundColor: "vec3(0.9, 0.8, 0.4)",
		},
		lighting: {
			ambientColor: 0xaad3ff,
			ambientIntensity: 0.3,
			sunColor: 0xffb24c,
			sunIntensity: 2.0,
			sunPosition: new THREE.Vector3(-200, 20, 20),
		},
		fog: {
			color: 0xcc9966,
			near: 150,
			far: 200,
		},
	},
	night: {
		sky: {
			skyColor: "vec3(0.08, 0.08, 0.25)",
			horizonColor: "vec3(0.1, 0.1, 0.1)",
			groundColor: "vec3(0.08, 0.1, 0.08)",
		},
		lighting: {
			ambientColor: 0xffffff,
			ambientIntensity: 0.2,
			sunColor: 0xccccff,
			sunIntensity: 0.3,
			sunPosition: new THREE.Vector3(20, 100, 20),
		},
		fog: {
			color: 0x191919,
			near: 100,
			far: 200,
		},
	},
};

function createSkyMaterial(timeOfDay) {
	const settings = ambienceSettings[timeOfDay].sky;
	const fragmentShader = `
	varying vec3 vWorldPosition;
	void main() {
		float y = normalize(vWorldPosition).y;
		vec3 skyColor = ${settings.skyColor};
		vec3 horizonColor = ${settings.horizonColor};
		vec3 groundColor = ${settings.groundColor};
		float horizonSharpness = 8.0;
		float t = pow(1.0 - abs(y), horizonSharpness);
		vec3 finalColor;
		if (y > 0.0) {
			finalColor = mix(skyColor, horizonColor, t);
		} else {
			finalColor = mix(groundColor, horizonColor, t);
		}
		gl_FragColor = vec4(finalColor, 1.0);
	}`;

	return new THREE.ShaderMaterial({
		vertexShader,
		fragmentShader,
		side: THREE.BackSide,
		depthWrite: false,
		fog: false,
	});
}

const skyGeo = new THREE.SphereGeometry(300, 32, 32);
let skyMat = createSkyMaterial("morning");
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

// Camera setup
const camera = new THREE.PerspectiveCamera(
	45,
	window.innerWidth / window.innerHeight,
	1,
	1500
);
camera.position.set(20, 5, -5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.minDistance = 5;
controls.maxDistance = 100;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.5;
controls.autoRotate = false;
controls.target = new THREE.Vector3(-20, 1, 30);
controls.update();

const groundGeometry = new THREE.PlaneGeometry(250, 250, 32, 32);
groundGeometry.rotateX(-Math.PI / 2);
const groundMaterial = new THREE.MeshStandardMaterial({
	color: 0x364531,
	side: THREE.DoubleSide,
	roughness: 0.8,
	metalness: 0.2,
});

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.receiveShadow = true;
// scene.add(ground);

const ambientLight = new THREE.AmbientLight(0xaad3ff, 0.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffb24c, 4);
sunLight.position.copy(ambienceSettings.morning.lighting.sunPosition);
sunLight.castShadow = true;

sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 500;
sunLight.shadow.camera.left = -200;
sunLight.shadow.camera.right = 200;
sunLight.shadow.camera.top = 200;
sunLight.shadow.camera.bottom = -200;
sunLight.shadow.bias = -0.000001;
sunLight.shadow.normalBias = 0.02;
sunLight.shadow.radius = 3;

scene.add(sunLight);

scene.fog = new THREE.Fog(0xffcc66, 150, 200);

function updateAmbience(timeOfDay) {
	const settings = ambienceSettings[timeOfDay];

	// Update sky
	sky.material = createSkyMaterial(timeOfDay);

	// Update lights
	ambientLight.color.setHex(settings.lighting.ambientColor);
	ambientLight.intensity = settings.lighting.ambientIntensity;
	sunLight.color.setHex(settings.lighting.sunColor);
	sunLight.intensity = settings.lighting.sunIntensity;
	sunLight.position.copy(settings.lighting.sunPosition);

	// Update fog
	scene.fog.color.setHex(settings.fog.color);
	scene.fog.near = settings.fog.near;
	scene.fog.far = settings.fog.far;
}

document.getElementById("ambience-select").addEventListener("change", (e) => {
	updateAmbience(e.target.value);
});

// Model loading
const loader = new GLTFLoader();
loader.load(
	"models/bugis-v4.glb",
	(gltf) => {
		const mesh = gltf.scene;

		mesh.traverse((child) => {
			if (child.isMesh) {
				child.castShadow = true;
				child.receiveShadow = true;

				if (child.material instanceof THREE.MeshStandardMaterial) {
					child.material.roughness = 0.7;
					child.material.metalness = 0.2;
				}
			}
		});

		mesh.position.set(-10, 0.7, 30);
		scene.add(mesh);

		document.getElementById("progress-container").style.display = "none";
	},
	(xhr) => {
		document.getElementById("progress").innerHTML = `LOADING ${Math.max(xhr.loaded / xhr.total, 1) * 100
			}/100`;
	},(error) => {
	    	console.error('Error loading model:', error);
	}
);

// Window resize handler
window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});

// Predefined camera movements
let animationRunning = true;
let cameraAnimation;

function orbitCamera(target, height, radius, duration = 15, direction = 1) {
	return new Promise((resolve) => {
		const angle = { theta: 0 };

		function startOrbit() {
			if (!animationRunning) return resolve();

			cameraAnimation = gsap.to(angle, {
				theta: Math.PI * 2 * direction,
				duration: duration,
				ease: "linear",
				onUpdate: () => {
					camera.position.x = target.x + radius * Math.cos(angle.theta);
					camera.position.y = target.y + height;
					camera.position.z = target.z + radius * Math.sin(angle.theta);
					camera.lookAt(target);
				},
				onComplete: () => {
					if (animationRunning) {
						angle.theta = 0;
						startOrbit();
					} else {
						orbitAnimation = null;
					}
				},
			});
		}

		startOrbit();
	});
}

function moveWithTargetCamera(target, start, end, duration = 15) {
	return new Promise((resolve) => {
		function startMoveWithTarget() {
			if (!animationRunning) return resolve();

			cameraAnimation = gsap.to(start, {
				x: end.x,
				y: end.y,
				z: end.z,
				duration: duration,
				ease: "linear",
				onUpdate: () => {
					camera.position.set(start.x, start.y, start.z);
					camera.lookAt(target);
				},
				onComplete: () => {
					if (animationRunning) {
						startMoveWithTarget();
					} else {
						orbitAnimation = null;
					}
				},
			});
		}

		startMoveWithTarget();
	});
}

function fadeTransition(duration = 1, fadeIn = true) {
	const overlay = document.getElementById("overlay");
	overlay.style.transition = `opacity ${duration}s`;
	overlay.style.opacity = fadeIn ? 1 : 0;

	return new Promise((resolve) => {
		setTimeout(() => resolve(), duration * 1000);
	});
}

async function changeAnimation(newAnimation) {
	animationRunning = false;
	await fadeTransition(1, true);
	if (cameraAnimation) cameraAnimation.kill();

	animationRunning = true;
	newAnimation();

	await fadeTransition(1, false);
}

window.addEventListener("mousedown", (event) => {
	if (event.target.tagName === "BUTTON") return;

	animationRunning = false;
	if (cameraAnimation) cameraAnimation.kill();
});

// Add buttons for new camera movements
const buttonContainer = document.createElement("div");
buttonContainer.style.position = "fixed";
buttonContainer.style.top = "10px";
buttonContainer.style.left = "10px";
buttonContainer.style.zIndex = "1000";

const Animation1 = document.createElement("button");
Animation1.textContent = "Animation 1";
Animation1.onclick = () =>
	changeAnimation(() => orbitCamera(new THREE.Vector3(0, 1, 0), 20, 60, 30));
buttonContainer.appendChild(Animation1);

const Animation2 = document.createElement("button");
Animation2.textContent = "Animation 2";
Animation2.onclick = () =>
	changeAnimation(() =>
		orbitCamera(new THREE.Vector3(0, 1, 20), 10, 45, 25, -1)
	);
buttonContainer.appendChild(Animation2);

const Animation3 = document.createElement("button");
Animation3.textContent = "Animation 3";
Animation3.onclick = () =>
	changeAnimation(() =>
		moveWithTargetCamera(
			new THREE.Vector3(0, 0, -1),
			new THREE.Vector3(-15, 1, -25),
			new THREE.Vector3(20, 1, 30),
			10
		)
	);
buttonContainer.appendChild(Animation3);

const Animation4 = document.createElement("button");
Animation4.textContent = "Animation 4";
Animation4.onclick = () =>
	changeAnimation(() =>
		moveWithTargetCamera(
			new THREE.Vector3(0, 0, -1),
			new THREE.Vector3(20, 5, 30),
			new THREE.Vector3(20, 35, 30),
			10
		)
	);
buttonContainer.appendChild(Animation4);

const Animation5 = document.createElement("button");
Animation5.textContent = "Animation 5";
Animation5.onclick = () =>
	changeAnimation(() =>
		moveWithTargetCamera(
			new THREE.Vector3(-30, 20, 25),
			new THREE.Vector3(-55, 32, 55),
			new THREE.Vector3(40, 20, 20),
			10
		)
	);
buttonContainer.appendChild(Animation5);

const overlay = document.createElement("div");
overlay.id = "overlay";
overlay.style.position = "fixed";
overlay.style.top = "0";
overlay.style.left = "0";
overlay.style.width = "100%";
overlay.style.height = "100%";
overlay.style.backgroundColor = "black";
overlay.style.opacity = "0";
overlay.style.pointerEvents = "none";
overlay.style.transition = "opacity 1s";

document.body.appendChild(buttonContainer);
document.body.appendChild(overlay);

// Animation loop
function animate() {
	requestAnimationFrame(animate);
	controls.update();
	renderer.render(scene, camera);
}

init();
