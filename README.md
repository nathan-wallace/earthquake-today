3D Earthquake Data Visualization
This app is a 3D visualization of recent earthquake data across the globe, using Three.js to create an interactive experience. Earthquake data is displayed as animated points on a 3D Earth model, with options to control playback, time, and interactivity.

Features
Realistic 3D Earth Model: Displays a globe with realistic textures, lighting, and an atmospheric glow.
Earthquake Visualization: Data points representing recent earthquakes are plotted on the globe, with size and color reflecting magnitude and location.

Interactive Controls:
Time slider to scroll through a 24-hour cycle, visualizing earthquake events.
Play/Pause button for controlling the animation.
Tooltip showing details (location, magnitude, and time) when hovering over data points.
Mouse drag functionality to rotate the globe for a better view.

Technologies Used
Three.js: For rendering the 3D Earth model and animations.
JavaScript: Controls app logic and user interactivity.
Web APIs: Fetches real-time earthquake data from the USGS Earthquake API in GeoJSON format.
Installation
Clone the repository:
bash
Copy code
git clone [URL to your repository]
Open index.html in your web browser.
Usage
Rotate the Globe: Click and drag to rotate.
View Earthquake Details: Hover over points to see earthquake details in a tooltip.
Control Animation:
Use the Time Slider to adjust the time of day displayed.
Click the Play/Pause Button to toggle real-time playback.
Code Overview
index.html: Sets up the basic HTML structure and loads the necessary scripts.
app.js: Contains the main logic for the 3D scene setup, data fetching, and interactive features.
Data Source
Real-time earthquake data is sourced from the USGS Earthquake API.
