# Digital Twin AR Exhibit

This repository contains the source code for an experimental **Interactive AR Exhibit** that explores the intersection of real-time human pose detection, volumetric particle rendering, and WebXR. This project serves as a testbed for my broader interactive technology research, including projection mapping, spatial computing, and digital twin concepts.

## Overview

The core of this project is a high-density, volumetric particle-based character that acts as a real-time digital twin. Driven by human pose detection, the digital twin mirrors the user's movements in physical space. It's designed to provide a highly engaging, cyberpunk-inspired visual experience featuring neon-cyan aesthetics, anatomically mapped volumes for the torso and limbs, and detailed facial meshing.

### Key Features
*   **WebXR Integration:** Immersive AR experience running directly in compatible web browsers, eliminating the need for app downloads.
*   **Real-time Pose Tracking:** Uses advanced pose estimation to dynamically drive the movement and posture of the digital twin.
*   **Volumetric Particle System:** The character is rendered using thousands of particles that dynamically form thick, anatomically correct volumes.
*   **Interactive Idle State:** The particle system dynamically expands and fills the screen when no user is detected, ensuring a continuous visual spectacle.
*   **Cyberpunk Aesthetics:** Consistent neon-cyan styling designed to look like a holographic projection.

## Technologies Used

*   **HTML5/CSS3:** Structure and styling of the user interface.
*   **JavaScript (ES6+):** Core application logic, rendering pipeline, and pose tracking integration.
*   **WebXR API:** For augmented reality rendering and camera access.

## Broader Context: Interactive Technology & Projection Mapping

This AR exhibit is part of a larger ongoing exploration into interactive installations. The techniques developed here for real-time body tracking, dynamic particle rendering, and spatial integration are foundational for future projects involving:

*   **Interactive Projection Mapping:** Extending the digital twin concept beyond screens to project dynamic avatars onto physical surfaces or architectural structures.
*   **Responsive Environments:** Building spaces that react organically to human presence and movement.
*   **Generative Art:** Using human motion data to generate unique, transient art pieces in real-time.

## Getting Started

To run this project locally:

1.  Clone this repository to your local machine.
2.  Serve the directory using a local web server (e.g., using Python's `http.server`, or a VS Code extension like Live Server). Due to browser security restrictions around accessing the camera, running directly from the filesystem (`file://`) will not work.
3.  Access the server URL from a WebXR-compatible browser (on a mobile device or AR headset).
4.  Grant camera permissions when prompted to start the pose detection.

## Future Enhancements

*   Integration with external projection systems for large-scale displays.
*   Multi-user tracking for collaborative AR experiences.
*   More complex particle physics and fluid dynamics.
