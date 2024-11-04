// Import Three.js components
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio); // Increase resolution of rendering
renderer.domElement.style.imageRendering = 'crisp-edges'; // Optional: Enhance rendering quality
renderer.domElement.setAttribute('aria-label', '3D Earth Visualization'); // WCAG compliant

document.body.appendChild(renderer.domElement);

// Set up camera position
camera.position.z = 150;

// Raycaster and mouse for interactivity
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let rotationSpeed = 0.005;

// Tooltip element
const tooltip = document.createElement('div');
tooltip.style.position = 'absolute';
tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
tooltip.style.color = 'white';
tooltip.style.padding = '5px';
tooltip.style.display = 'none';
tooltip.setAttribute('role', 'tooltip'); // WCAG compliant
document.body.appendChild(tooltip);

// Add ambient and directional light
const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(50, 50, 50).normalize();
scene.add(directionalLight);

// Create Earth sphere with realistic textures
const earthGeometry = new THREE.SphereGeometry(30, 64, 64);
const textureLoader = new THREE.TextureLoader();

const earthMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load('https://designheritage.mit.edu/_dh_debug/THREEjs_122/examples/textures/planets/earth_atmos_2048.jpg'),
    bumpMap: textureLoader.load('https://designheritage.mit.edu/_dh_debug/THREEjs_122/examples/textures/planets/earth_normal_2048.jpg'),
    bumpScale: 0.5,
    specularMap: textureLoader.load('https://designheritage.mit.edu/_dh_debug/THREEjs_122/examples/textures/planets/earth_specular_2048.jpg'),
    specular: new THREE.Color('white'),
    shininess: 50
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// Add atmosphere (glow effect)
const atmosphereGeometry = new THREE.SphereGeometry(32, 64, 64);
const atmosphereMaterial = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.3
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
scene.add(atmosphere);

// Group to hold earth and data points
const earthGroup = new THREE.Group();
earthGroup.add(earth);
earthGroup.add(atmosphere);
scene.add(earthGroup);

let dataPoints = [];
const accelerationFactor = 1000; // Scale to speed up time (1 hour = 1 second)
let currentTime = 0; // Set initial time to the beginning of the day
let isPlaying = true; // Autoplay by default

// Time slider element
const timeSliderContainer = document.createElement('div');
timeSliderContainer.style.position = 'absolute';
timeSliderContainer.style.bottom = '20px';
timeSliderContainer.style.left = '50%';
timeSliderContainer.style.transform = 'translateX(-50%)';
timeSliderContainer.style.width = '80%';
timeSliderContainer.style.textAlign = 'center';
timeSliderContainer.style.color = 'white';
timeSliderContainer.style.padding = '10px';
timeSliderContainer.style.backgroundColor = '#1b1b1b'; // USWDS color scheme
// Ensure mobile responsiveness
timeSliderContainer.style.borderRadius = '8px';
timeSliderContainer.style.boxSizing = 'border-box';
timeSliderContainer.style.maxWidth = '95%';
timeSliderContainer.setAttribute('role', 'region'); // WCAG compliant
document.body.appendChild(timeSliderContainer);

const timeSliderLabel = document.createElement('label');
timeSliderLabel.innerText = 'Time: ';
timeSliderLabel.style.marginRight = '10px';
timeSliderLabel.setAttribute('for', 'time-slider'); // WCAG compliant
timeSliderContainer.appendChild(timeSliderLabel);

const timeSlider = document.createElement('input');
timeSlider.type = 'range';
timeSlider.id = 'time-slider'; // For WCAG
timeSlider.min = '0';
timeSlider.max = '86400'; // Seconds in a day
timeSlider.value = '0';
timeSlider.style.width = '60%'; // Adjust width for better mobile responsiveness
timeSlider.setAttribute('aria-valuemin', '0');
timeSlider.setAttribute('aria-valuemax', '86400');
timeSlider.setAttribute('aria-valuenow', '0');
timeSlider.setAttribute('aria-label', 'Time slider'); // WCAG compliant
timeSliderContainer.appendChild(timeSlider);

const timeDisplay = document.createElement('span');
timeDisplay.id = 'time-display';
timeDisplay.style.marginLeft = '10px';
timeDisplay.innerText = convertToAMPM(currentTime); // Set initial time
timeSliderContainer.appendChild(timeDisplay);

const playButton = document.createElement('button');
playButton.innerText = 'Pause'; // Start in playing mode
playButton.style.marginLeft = '10px';
playButton.setAttribute('aria-label', 'Play/Pause button'); // WCAG compliant
timeSliderContainer.appendChild(playButton);

playButton.addEventListener('click', () => {
    isPlaying = !isPlaying;
    playButton.innerText = isPlaying ? 'Pause' : 'Play';
    playButton.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
});

timeSlider.addEventListener('input', () => {
    currentTime = parseInt(timeSlider.value) * 1000; // Update current time based on slider value
    timeSlider.setAttribute('aria-valuenow', timeSlider.value);
    timeDisplay.innerText = convertToAMPM(currentTime); // Update time display
    isPlaying = false;
    playButton.innerText = 'Play';
});

// Load and parse data
async function loadData() {
    try {
        const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
        const data = await response.json();
        visualizeData(data);
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// Visualize data in 3D
function visualizeData(data) {
    data.features.forEach(feature => {
        const { coordinates } = feature.geometry;
        const magnitude = feature.properties.mag;
        const time = feature.properties.time;

        // Create a sphere geometry for each earthquake
        const sphereGeometry = new THREE.SphereGeometry(0.5 * magnitude, 16, 16);
        const color = new THREE.Color(`hsl(${(1 - magnitude / 10) * 60}, 100%, 50%)`);
        const sphereMaterial = new THREE.MeshStandardMaterial({ color });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

        // Set sphere position based on coordinates
        const [lon, lat, depth] = coordinates;
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        sphere.position.x = -30 * Math.sin(phi) * Math.cos(theta);
        sphere.position.y = 30 * Math.cos(phi);
        sphere.position.z = 30 * Math.sin(phi) * Math.sin(theta);

        // Store earthquake properties in the sphere for tooltip and animation
        sphere.userData = {
            magnitude,
            place: feature.properties.place,
            time: new Date(time).toLocaleString(),
            timestamp: time
        };

        sphere.visible = false; // Initially hidden
        earthGroup.add(sphere);
        dataPoints.push(sphere);
    });
}

// Handle mouse movement for tooltip
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(dataPoints.filter(point => point.visible));

    if (intersects.length > 0) {
        const intersected = intersects[0].object;
        const { magnitude, place, time } = intersected.userData;
        tooltip.style.display = 'block';
        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.top = `${event.clientY + 10}px`;
        tooltip.innerHTML = `
            <strong>Location:</strong> ${place}<br>
            <strong>Magnitude:</strong> ${magnitude}<br>
            <strong>Time:</strong> ${convertToAMPM(time)}
        `;
    } else {
        tooltip.style.display = 'none';
    }
}

// Handle mouse down and up for dragging
function onMouseDown(event) {
    isDragging = true;
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseUp(event) {
    isDragging = false;
}

function onMouseMoveDrag(event) {
    if (isDragging) {
        const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y
        };

        earthGroup.rotation.y += deltaMove.x * rotationSpeed;
        earthGroup.rotation.x += deltaMove.y * rotationSpeed;

        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }
}

function toRadians(angle) {
    return angle * (Math.PI / 180);
}

// Convert time to AM/PM format
function convertToAMPM(time) {
    const date = new Date(time);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // The hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
}

// Animation loop with pulsating effect
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    if (isPlaying) {
        currentTime += 1000 / 60 * accelerationFactor; // Increment current time in accelerated seconds
        if (currentTime >= 86400 * 1000) { // Loop time after a full day
            currentTime = 0;
        }
        timeSlider.value = (currentTime / 1000).toFixed(0);
        timeDisplay.innerText = convertToAMPM(currentTime); // Update time display
    }

    dataPoints.forEach(point => {
        const timeDiff = currentTime - (point.userData.timestamp % (24 * 60 * 60 * 1000));
        if (timeDiff > 0) { // Only show after occurrence
            point.visible = true;
            if (timeDiff < 3600000) { // Pulsate for 1 hour after occurrence
                const scale = 1 + 0.5 * Math.sin((timeDiff / 3600000) * Math.PI * 2);
                point.scale.set(scale, scale, scale);
            } else {
                point.scale.set(1, 1, 1);
            }
        } else {
            point.visible = false;
        }
    });
}

// Event listeners
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mouseup', onMouseUp);
window.addEventListener('mousemove', onMouseMoveDrag);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}); // Ensure responsiveness on window resize

// Call functions to load data and start animation
loadData();
animate();
