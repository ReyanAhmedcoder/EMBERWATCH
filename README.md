# EMBERWATCH

EMBERWATCH is a browser-based horror prototype built with HTML, CSS, and JavaScript, using Three.js from a CDN and procedural Web Audio for the sound design.

## Features

- Full-screen 3D prototype scene
- Procedural audio with synthesized wind, static, footsteps, heartbeat, and jump-scare effects
- Interactive title screen, objective HUD, dialogue, and journal note overlays
- In-game clock starting at 11:47 PM and advancing one game minute per real second until dawn
- Keyboard and mouse controls for exploration and interaction

## Run locally

1. Open the project folder in a local web server.
2. Start a simple server, for example:

   python -m http.server 8000

3. Visit http://localhost:8000

## Files

- `index.html` — page structure
- `styles.css` — interface styling and typography
- `game.js` — gameplay logic, audio, scene, and interactions
- `three-loader.js` — Three.js CDN loader fallback

## Notes

This is a prototype and is designed to run in a modern browser with WebGL enabled.
