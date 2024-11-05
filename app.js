// Import Three.js components
const scene = new THREE.Scene();
const container = document.getElementById('container');

// Set up the renderer to use the existing canvas element
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('earthquakeCanvas'),
    antialias: true
});

// Set the size of the renderer to the container's width and height
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.domElement.style.imageRendering = 'crisp-edges';
renderer.domElement.setAttribute('aria-label', '3D Earth Visualization');
renderer.setClearColor(0x1b1b1b); // Set background color of the canvas

// Set up the camera
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.z = 100; // Start closer for better initial zoom-in effect

// Handle window resizing to keep the renderer and camera in sync with the container
window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

// Add zoom functionality using the mouse wheel
const MIN_ZOOM = 50;
const MAX_ZOOM = 300;

let userInteracted = false; // Track whether user has interacted

container.addEventListener('wheel', (event) => {
    camera.position.z += event.deltaY * 0.05;
    camera.position.z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.position.z));
    event.preventDefault();
    userInteracted = true; // User interaction detected, stop auto animation
    updateSceneOnZoom();
});

// Add ambient and directional light
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(50, 50, 50).normalize();
scene.add(directionalLight);

// Create Earth sphere with realistic textures
const earthGeometry = new THREE.SphereGeometry(30, 64, 64);
const textureLoader = new THREE.TextureLoader();

const earthMaterial = new THREE.MeshPhongMaterial({

    map: textureLoader.load('./earth_atmos_2048.jpg'),
    bumpMap: textureLoader.load('./earth_normal_2048.jpg'),
    specularMap: textureLoader.load('./earth_specular_2048.jpg'),
    bumpScale: 0.5,
    specular: new THREE.Color('white'),
    shininess: 50
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// Add atmosphere (glow effect)
const atmosphereGeometry = new THREE.SphereGeometry(32, 64, 64);
const atmosphereMaterial = new THREE.MeshBasicMaterial({
    color: 0x99BACA,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.1
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
scene.add(atmosphere);

// Group to hold earth and data points
const earthGroup = new THREE.Group();
earthGroup.add(earth);
earthGroup.add(atmosphere);
earthGroup.rotation.x = 20 * (Math.PI / 180); // Tilt down by 20 degrees
scene.add(earthGroup);

// Add UI elements (time slider and play/pause button)
const timeSliderContainer = document.createElement('div');
timeSliderContainer.style.position = 'relative'; // Use relative positioning
timeSliderContainer.style.marginBottom = '0px'; // Add space between the timeline and globe
timeSliderContainer.style.width = '100%';
timeSliderContainer.style.maxWidth = '1200px';
timeSliderContainer.style.textAlign = 'center';
timeSliderContainer.style.color = 'white';
timeSliderContainer.style.padding = '10px';
timeSliderContainer.style.paddingBottom = '0px';
timeSliderContainer.style.backgroundColor = '#1b1b1b';
timeSliderContainer.style.borderRadius = '8px';
timeSliderContainer.style.boxSizing = 'border-box';

// Insert the timeline container above the globe container
container.parentElement.insertBefore(timeSliderContainer, container);

// Create the label, slider, time display, and play button
const timeSliderLabel = document.createElement('label');
timeSliderLabel.innerText = 'Time: ';
timeSliderLabel.style.marginRight = '10px';
timeSliderContainer.appendChild(timeSliderLabel);

const timeSlider = document.createElement('input');
timeSlider.type = 'range';
timeSlider.min = '0';
timeSlider.max = '86400'; // Seconds in a day
timeSlider.value = '0';
timeSlider.style.width = '60%';
timeSliderContainer.appendChild(timeSlider);

const timeDisplay = document.createElement('span');
timeDisplay.style.marginLeft = '10px';
timeDisplay.innerText = '00:00';
timeSliderContainer.appendChild(timeDisplay);

const playButton = document.createElement('button');
playButton.innerText = 'Pause';
playButton.style.marginLeft = '10px';
timeSliderContainer.appendChild(playButton);


// Load and parse earthquake data
let dataPoints = [];
let hitboxes = [];
let currentTime = 0; // Current time in seconds (0 - 86400)
let isPlaying = true; // Play/Pause state
const animationSpeed = 50; // Speed of time progression

async function loadData() {
    try {
        const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
        const data = await response.json();
        visualizeData(data);
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// Visualize earthquake data in 3D
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

        // Create a slightly larger hitbox to make the tooltip easier to trigger
        const hitboxGeometry = new THREE.SphereGeometry(0.6 * magnitude, 16, 16);
        const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
        const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
        hitbox.position.copy(sphere.position);

        // Store earthquake properties in the sphere for tooltip and animation
        sphere.userData = {
            magnitude,
            place: feature.properties.place,
            time: new Date(time).toLocaleString(),
            timestamp: time,
            pulsateCount: 0 // Track the number of pulsations
        };

        sphere.visible = false; // Initially hidden
        hitbox.visible = false;

        earthGroup.add(sphere);
        earthGroup.add(hitbox);

        dataPoints.push(sphere);
        hitboxes.push(hitbox);
    });
}

// Tooltip for showing earthquake details on hover
const tooltip = document.createElement('div');
tooltip.style.position = 'absolute';
tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
tooltip.style.color = 'white';
tooltip.style.padding = '10px';
tooltip.style.borderRadius = '5px';
tooltip.style.fontSize = '14px';
tooltip.style.display = 'none';
tooltip.style.pointerEvents = 'none'; // Ensures the tooltip does not interfere with pointer interactions
tooltip.style.zIndex = '1000'; // Ensure tooltip is above other elements
document.body.appendChild(tooltip);

// Handle mouse movement for showing tooltip
const raycaster = new THREE.Raycaster();
raycaster.params.Points = { threshold: 1.5 }; // Increase threshold to make smaller points easier to detect
const mouse = new THREE.Vector2();

container.addEventListener('mousemove', (event) => {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(hitboxes.filter(hitbox => hitbox.visible));

    if (intersects.length > 0) {
        const intersected = intersects[0].object;
        const correspondingDataPoint = dataPoints.find(point => point.position.equals(intersected.position));
        if (correspondingDataPoint) {
            const { magnitude, place, time } = correspondingDataPoint.userData;
            tooltip.style.display = 'block';
            tooltip.style.left = `${event.clientX + 10}px`;
            tooltip.style.top = `${event.clientY + 10}px`;
            tooltip.innerHTML = `
                <strong>Location:</strong> ${place}<br>
                <strong>Magnitude:</strong> ${magnitude}<br>
                <strong>Time:</strong> ${time}
            `;
        }
    } else {
        tooltip.style.display = 'none';
    }
});

// Track current time for animation purposes
let previousMousePosition = { x: 0, y: 0 };
let isDragging = false;

// Enable click-and-drag to rotate the globe
container.addEventListener('mousedown', (event) => {
    isDragging = true;
    userInteracted = true; // User interaction detected, stop auto animation
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
});

container.addEventListener('mouseup', () => {
    isDragging = false;
});

container.addEventListener('mousemove', (event) => {
    if (isDragging) {
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;

        const rotationSpeed = 0.005;
        earthGroup.rotation.y += deltaX * rotationSpeed;
        earthGroup.rotation.x += deltaY * rotationSpeed;

        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }
});

// Update the time slider and data point visibility
function updateDataPoints() {
    dataPoints.forEach((point, index) => {
        const pointTime = point.userData.timestamp;
        const timeElapsed = (currentTime * 1000) % (24 * 60 * 60 * 1000);

        if (timeElapsed >= (pointTime % (24 * 60 * 60 * 1000))) {
            point.visible = true;
            hitboxes[index].visible = true;

            // Smooth and slower pulsating effect for two pulses
            if (point.userData.pulsateCount < 2) {
                const scale = 1 + 0.2 * Math.sin((Date.now() / 500) * Math.PI); // Slower and more gradual pulsation
                point.scale.set(scale, scale, scale);
                if (Math.sin((Date.now() / 500) * Math.PI) > 0.9) {
                    point.userData.pulsateCount++;
                }
            } else {
                // Set to normal size, change to red, and reduce opacity
                point.scale.set(1, 1, 1);
                point.material.color.set('red');
                point.material.opacity = 0.5;
                point.material.transparent = true;
            }
        } else {
            point.visible = false;
            hitboxes[index].visible = false;
        }
    });
}

// Play/pause button functionality
playButton.addEventListener('click', () => {
    isPlaying = !isPlaying;
    playButton.innerText = isPlaying ? 'Pause' : 'Play';
});

// Time slider functionality
timeSlider.addEventListener('input', () => {
    currentTime = parseInt(timeSlider.value, 10);
    timeDisplay.innerText = formatTime(currentTime);
    updateDataPoints();
});

function formatTime(seconds) {
    // Calculate the hours, minutes, and seconds
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    // Create a new Date object for the current day with the current time
    const today = new Date();
    today.setUTCHours(hours, minutes, 0, 0);

    // Format the date using Intl.DateTimeFormat for a specific timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'America/New_York', // You can change this to any valid timezone or use user's default
        timeZoneName: 'short' // Display the timezone abbreviation
    });

    return formatter.format(today);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    // Default animation: Rotate and zoom in until user interaction
    if (!userInteracted) {
        earthGroup.rotation.y += 0.001; // Slow rotation
        camera.position.z = Math.max(camera.position.z - 0.2, 70); // Slow zoom in until z = 100
    }

    // Update the time and visibility of data points if playing
    if (isPlaying) {
        currentTime = (currentTime + animationSpeed) % 86400;
        timeSlider.value = currentTime;
        timeDisplay.innerText = formatTime(currentTime);
        updateDataPoints();
    }
}

// Update the scene on camera movement (zoom)
function updateSceneOnZoom() {
    const scaleFactor = camera.position.z / 150;
    dataPoints.forEach(point => {
        point.scale.set(scaleFactor, scaleFactor, scaleFactor);
    });
}

// Load data and start the animation
loadData();
animate();
