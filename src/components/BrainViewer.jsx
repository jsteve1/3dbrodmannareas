import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default function BrainViewer({ onBrainClick, selectedBA, brainMeshes, darkMode, onMeshesLoaded }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const brainRef = useRef(null);
  const meshMapRef = useRef(new Map());
  const darkModeRef = useRef(darkMode);
  const selectedBARef = useRef(selectedBA); // Store selectedBA in a ref

  console.log('BrainViewer render - darkMode:', darkMode);

  // Update refs whenever they change
  useEffect(() => {
    darkModeRef.current = darkMode;
    console.log('darkModeRef updated to:', darkMode);
  }, [darkMode]);

  useEffect(() => {
    selectedBARef.current = selectedBA;
    console.log('selectedBARef updated to:', selectedBA);
  }, [selectedBA]);

  useEffect(() => {
    console.log('Setting up scene...');
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111); // Start with dark, will be updated by darkMode effect
    sceneRef.current = scene;
    console.log('Scene created with initial background');

    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(3, 1, 3); // Side angle view
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(5, 5, 5);
    scene.add(light);
    const light2 = new THREE.DirectionalLight(0xffffff, 0.8);
    light2.position.set(-5, -5, -5);
    scene.add(light2);

    // Load brain model
    const loader = new GLTFLoader();
    loader.load('brain_segmented2.glb', (gltf) => {
      const brain = gltf.scene;
      brain.scale.setScalar(0.7); // Zoom in more
      brainRef.current = brain;

      const meshes = [];
      brain.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          // More distinct colors: wider hue range, higher saturation
          const hue = Math.random();
          const saturation = 0.8 + Math.random() * 0.2; // 0.8-1.0
          const lightness = 0.5 + Math.random() * 0.2; // 0.5-0.7
          child.material.color.setHSL(hue, saturation, lightness);
          child.userData.originalColor = child.material.color.clone();
          meshMapRef.current.set(child.name, child);
          meshes.push({ name: child.name, mesh: child });
        }
      });

      if (brainMeshes) {
        brainMeshes.current = meshes;
      }

      if (onMeshesLoaded) {
        onMeshesLoaded();
      }

      scene.add(brain);
    });

    // Click handler
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event) => {
      // Prevent clicks if click target is not the canvas
      if (event.target.tagName !== 'CANVAS') return;
      
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      
      // Only intersect with brain meshes, not all scene objects
      const brainMeshes = [];
      if (brainRef.current) {
        brainRef.current.traverse((child) => {
          if (child.isMesh) {
            brainMeshes.push(child);
          }
        });
      }
      
      const intersects = raycaster.intersectObjects(brainMeshes, false);

      if (intersects.length > 0) {
        // Get the first (closest) intersection
        const clicked = intersects[0].object;
        console.log('Clicked:', clicked.name, 'distance:', intersects[0].distance);
        if (clicked.name && onBrainClick) {
          onBrainClick(clicked.name);
        }
      }
    };

    mountRef.current.addEventListener('click', handleClick);

    // Resize handler
    const handleResize = () => {
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    function animate() {
      controls.update();
      
      // Update background color based on current darkMode
      const targetColor = darkModeRef.current ? 0x111111 : 0xffffff;
      if (scene.background.getHex() !== targetColor) {
        scene.background.setHex(targetColor);
        console.log('Background updated in animation loop to:', targetColor);
      }
      
      // Update mesh colors based on selection
      const currentSelectedBA = selectedBARef.current;
      meshMapRef.current.forEach((mesh, name) => {
        if (currentSelectedBA && name === currentSelectedBA) {
          // Selected - bright original color with glow
          if (!mesh.material.color.equals(mesh.userData.originalColor)) {
            mesh.material.color.copy(mesh.userData.originalColor);
            mesh.material.emissive.copy(mesh.userData.originalColor);
            mesh.material.emissiveIntensity = 0.5;
          }
        } else if (currentSelectedBA && name !== currentSelectedBA) {
          // Not selected - gray
          const gray = new THREE.Color(0x666666);
          if (!mesh.material.color.equals(gray)) {
            mesh.material.color.copy(gray);
            mesh.material.emissive.setRGB(0, 0, 0);
            mesh.material.emissiveIntensity = 0;
          }
        } else if (!currentSelectedBA) {
          // No selection - show original color
          if (!mesh.material.color.equals(mesh.userData.originalColor)) {
            mesh.material.color.copy(mesh.userData.originalColor);
            mesh.material.emissive.setRGB(0, 0, 0);
            mesh.material.emissiveIntensity = 0;
          }
        }
      });
      
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeEventListener('click', handleClick);
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onBrainClick, brainMeshes]);

  return <div ref={mountRef} className="w-full h-full cursor-pointer" />;
}

