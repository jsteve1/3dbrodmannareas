import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default function BrainViewer({ onBrainClick, selectedBA, brainMeshes, darkMode, sectionColorsEnabled, onMeshesLoaded }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const brainRef = useRef(null);
  const meshMapRef = useRef(new Map());
  const darkModeRef = useRef(darkMode);
  const selectedBARef = useRef(selectedBA); // Store selectedBA in a ref
  const sectionColorsEnabledRef = useRef(sectionColorsEnabled);


  // Update refs whenever they change
  useEffect(() => {
    darkModeRef.current = darkMode;
  }, [darkMode]);

  useEffect(() => {
    selectedBARef.current = selectedBA;
  }, [selectedBA]);

  useEffect(() => {
    sectionColorsEnabledRef.current = sectionColorsEnabled;
  }, [sectionColorsEnabled]);

  useEffect(() => {
    // Prevent setup if mount point already has children (from previous mount)
    if (mountRef.current && mountRef.current.children.length > 0) {
      while (mountRef.current.firstChild) {
        mountRef.current.removeChild(mountRef.current.firstChild);
      }
    }
    
    // Track if component is mounted to prevent double-loading
    let isMounted = true;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101010); // Match new dark mode background
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(4, 1.5, 4); // Zoomed out view for better default scale
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Canvas styling - display block prevents extra space
    renderer.domElement.style.display = 'block';
    
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controls.minDistance = 2.5; // Prevent zooming too close
    controls.maxDistance = 12; // Allow zooming out more
    controls.enablePan = false; // Disable panning to keep brain centered
    
    // Test that controls are working
    controls.addEventListener('change', () => {
      // OrbitControls changed
    });
    
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
      // Only proceed if component is still mounted
      if (!isMounted) {
        return;
      }
      
      const brain = gltf.scene;
      brain.scale.setScalar(0.7); // Zoom in more
      brainRef.current = brain;

      // Collect all meshes first and store original colors
      const meshes = [];
      const meshObjects = [];
      brain.traverse((child) => {
        if (child.isMesh && child.material) {
          // Store the original GLTF color before replacing material
          const originalGLTFColor = child.material.color ? child.material.color.clone() : new THREE.Color(0xC9B5A8);
          
          // Check if this is the BRAIN parent mesh
          if (child.name === 'BRAIN') {
            // Give BRAIN mesh a lighter gray
            child.material = new THREE.MeshStandardMaterial({
              color: 0x999999,
              metalness: 0.1,
              roughness: 0.6,
              flatShading: false,
            });
            child.userData.originalGLTFColor = originalGLTFColor;
            child.userData.originalColor = child.material.color.clone();
            child.userData.customColor = child.material.color.clone();
            meshMapRef.current.set(child.name, child);
          } else {
            // Create completely new material for Brodmann areas
            child.material = new THREE.MeshStandardMaterial({
              metalness: 0.1,
              roughness: 0.6,
              flatShading: false,
            });
            child.userData.originalGLTFColor = originalGLTFColor;
            meshObjects.push(child);
            meshes.push({ name: child.name, mesh: child });
          }
        }
      });

      // Calculate centroids for each mesh
      const centroids = new Map();
      meshObjects.forEach(mesh => {
        mesh.geometry.computeBoundingBox();
        const bbox = mesh.geometry.boundingBox;
        const centroid = new THREE.Vector3();
        centroid.addVectors(bbox.min, bbox.max).multiplyScalar(0.5);
        mesh.localToWorld(centroid);
        centroids.set(mesh.name, centroid);
      });

      // Find neighbors (meshes within proximity threshold)
      const neighbors = new Map();
      const PROXIMITY_THRESHOLD = 15; // Adjust based on model scale
      
      meshObjects.forEach(mesh1 => {
        const n = [];
        const c1 = centroids.get(mesh1.name);
        
        meshObjects.forEach(mesh2 => {
          if (mesh1.name !== mesh2.name) {
            const c2 = centroids.get(mesh2.name);
            const distance = c1.distanceTo(c2);
            if (distance < PROXIMITY_THRESHOLD) {
              n.push(mesh2.name);
            }
          }
        });
        
        neighbors.set(mesh1.name, n);
      });

      // Greedy graph coloring with maximally spaced hues
      const colorMap = new Map();
      const NUM_COLORS = 12; // Base palette size
      const usedColors = new Map();
      
      // Sort meshes by number of neighbors (most constrained first)
      const sortedMeshes = [...meshObjects].sort((a, b) => {
        return (neighbors.get(b.name)?.length || 0) - (neighbors.get(a.name)?.length || 0);
      });

      sortedMeshes.forEach(mesh => {
        const meshNeighbors = neighbors.get(mesh.name) || [];
        const neighborColors = new Set();
        
        // Collect colors used by neighbors
        meshNeighbors.forEach(neighborName => {
          const neighborColor = colorMap.get(neighborName);
          if (neighborColor !== undefined) {
            neighborColors.add(neighborColor);
          }
        });
        
        // Find first available color not used by neighbors
        let assignedColor = 0;
        while (neighborColors.has(assignedColor)) {
          assignedColor++;
        }
        
        colorMap.set(mesh.name, assignedColor);
        usedColors.set(assignedColor, (usedColors.get(assignedColor) || 0) + 1);
      });

      // Define measured, pleasant colors (avoiding reds/oranges/browns)
      const pleasantColors = [
        0x00C5CD,  // Turquoise 3 (toned cyan)
        0x4682B4,  // Steel Blue (toned blue)
        0x32CD32,  // Lime Green (toned green)
        0xBA55D3,  // Medium Orchid (toned magenta)
        0xDB7093,  // Pale Violet Red (toned pink)
        0xFFD700,  // Gold (toned yellow)
        0x9ACD32,  // Yellow Green (toned chartreuse)
        0x4169E1,  // Royal Blue (toned dodger blue)
        0xC71585,  // Medium Violet Red (toned hot pink)
        0x3CB371,  // Medium Sea Green (toned spring green)
        0x9370DB,  // Medium Purple (toned orchid)
        0x48D1CC,  // Medium Turquoise (toned turquoise)
      ];
      
      // Special colors for specific Brodmann areas
      const getSpecialColor = (name) => {
        if (!name) return null;
        // Extract number from name (handles "1", "BA1", "ba1", "Area 1", etc.)
        const match = name.match(/\d+/);
        if (!match) return null;
        const num = match[0];
        
        switch(num) {
          case '1':
          case '2':
          case '3':
            return 0xFFFF00; // Bright Yellow
          case '4':
            return 0xFF8C00; // Dark Orange
          default:
            return null;
        }
      };
      
      // Assign colors with maximum separation and optionally add black borders
      meshObjects.forEach(mesh => {
        let colorHex;
        
        // Check if this mesh has a special color assignment
        const specialColor = getSpecialColor(mesh.name);
        if (specialColor !== null) {
          colorHex = specialColor;
        } else {
          // Use graph coloring for all other areas
          const colorIndex = colorMap.get(mesh.name) || 0;
          colorHex = pleasantColors[colorIndex % pleasantColors.length];
        }
        
        // Set color directly using hex
        mesh.material.color.setHex(colorHex);
        mesh.material.emissive.setHex(0x000000);
        mesh.material.emissiveIntensity = 0;
        mesh.userData.originalColor = mesh.material.color.clone();
        
        // Store original material color for when colors are disabled
        mesh.userData.customColor = mesh.material.color.clone();
        
        meshMapRef.current.set(mesh.name, mesh);
        
        // Add bold black borders only at sharp angles (area boundaries)
        const edges = new THREE.EdgesGeometry(mesh.geometry, 60); // Higher threshold = only sharp edges
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: 0x000000,
          linewidth: 1.5, // Bolder lines
          opacity: 0.5,
          transparent: true
        });
        const line = new THREE.LineSegments(edges, lineMaterial);
        line.renderOrder = 1; // Render edges on top
        line.name = 'edgeLine'; // Tag for later removal/toggle
        mesh.add(line);
      });

      if (brainMeshes) {
        brainMeshes.current = meshes;
      }

      if (onMeshesLoaded) {
        onMeshesLoaded();
      }

      scene.add(brain);
      console.log('Brain added to scene');
    });

    // Click and touch handler with debouncing
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let lastInteractionTime = 0;
    const DEBOUNCE_DELAY = 300; // 300ms debounce
    
    // Track touch movement to distinguish tap from drag
    let touchStartPos = { x: 0, y: 0 };
    let touchMoved = false;
    
    // Track mouse movement to distinguish click from drag
    let mouseStartPos = { x: 0, y: 0 };
    let mouseMoved = false;

    const handleInteraction = (clientX, clientY) => {
      // Debounce: prevent rapid-fire selections
      const now = Date.now();
      if (now - lastInteractionTime < DEBOUNCE_DELAY) {
        return;
      }
      lastInteractionTime = now;
      
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

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
        
        // Only proceed if it's a valid Brodmann area (not BRAIN)
        if (clicked.name && clicked.name !== 'BRAIN') {
          if (onBrainClick) {
            onBrainClick(clicked.name);
            console.log('onBrainClick called with:', clicked.name);
          }
        } else {
          // Clicked on BRAIN mesh - ignore if area is selected
          if (!selectedBARef.current) {
            if (onBrainClick) {
              onBrainClick(null);
            }
          }
        }
      } else {
        // Clicked outside the brain - ignore if area is selected
        if (!selectedBARef.current) {
          if (onBrainClick) {
            onBrainClick(null);
          }
        }
      }
    };

    const handleMouseDown = (event) => {
      mouseStartPos = { x: event.clientX, y: event.clientY };
      mouseMoved = false;
    };

    const handleMouseMove = (event) => {
      if (event.buttons > 0) { // Only track if mouse button is pressed
        const dx = event.clientX - mouseStartPos.x;
        const dy = event.clientY - mouseStartPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If moved more than 5 pixels, consider it a drag
        if (distance > 5) {
          mouseMoved = true;
        }
      }
    };

    const handleClick = (event) => {
      // Only register as a click if mouse didn't move (wasn't a drag)
      if (!mouseMoved) {
        handleInteraction(event.clientX, event.clientY);
      }
    };

    const handleTouchStart = (event) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };
        touchMoved = false;
      }
    };

    const handleTouchMove = (event) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        const dx = touch.clientX - touchStartPos.x;
        const dy = touch.clientY - touchStartPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If moved more than 10 pixels, consider it a drag/rotate gesture
        if (distance > 10) {
          touchMoved = true;
        }
      }
    };

    const handleTouchEnd = (event) => {
      if (event.changedTouches.length === 1 && !touchMoved) {
        // Only register as a tap if the touch didn't move (wasn't a drag/rotate)
        const touch = event.changedTouches[0];
        handleInteraction(touch.clientX, touch.clientY);
      }
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', handleTouchMove, { passive: true });
    renderer.domElement.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Resize handler - properly maintains aspect ratio and centers brain
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      if (width === 0 || height === 0) return;
      
      // Update camera aspect ratio
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      // Ensure camera looks at center
      camera.lookAt(0, 0, 0);
      
      // Force controls to center on origin (brain position)
      if (controls) {
        controls.target.set(0, 0, 0);
        controls.update();
      }
      
      // Update renderer size - this sets the actual canvas resolution
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(mountRef.current);
    
    // Call handleResize initially to ensure correct setup
    handleResize();

    // Animation loop - using standard Three.js pattern
    function animate() {
      requestAnimationFrame(animate);
      
      controls.update();
      
      // Update background color based on current darkMode
      const targetColor = darkModeRef.current ? 0x101010 : 0xffffff;
      if (scene.background.getHex() !== targetColor) {
        scene.background.setHex(targetColor);
      }
      
      // Update mesh colors based on selection and sectionColorsEnabled
      const currentSelectedBA = selectedBARef.current;
      const grayColor = new THREE.Color(0x666666);
      
      const colorsEnabled = sectionColorsEnabledRef.current;
      
      meshMapRef.current.forEach((mesh, name) => {
        if (!mesh.material || !mesh.userData.customColor) return;
        
        // Toggle visibility of edge lines based on sectionColorsEnabled
        mesh.children.forEach(child => {
          if (child.name === 'edgeLine') {
            child.visible = colorsEnabled;
          }
        });
        
        if (currentSelectedBA && name === currentSelectedBA) {
          // Selected - use custom color with glow
          mesh.material.color.copy(mesh.userData.customColor);
          mesh.material.emissive.copy(mesh.userData.customColor);
          mesh.material.emissiveIntensity = 0.5;
        } else if (currentSelectedBA && name !== currentSelectedBA) {
          // Not selected - blend color heavily with gray
          const blendedColor = new THREE.Color().copy(mesh.userData.customColor);
          blendedColor.lerp(grayColor, 0.85); // 85% gray, 15% original color
          mesh.material.color.copy(blendedColor);
          mesh.material.emissive.setHex(0x000000);
          mesh.material.emissiveIntensity = 0;
        } else if (!currentSelectedBA) {
          // No selection - show custom color or realistic brain color based on toggle
          if (colorsEnabled) {
            mesh.material.color.copy(mesh.userData.customColor);
          } else {
            // Use realistic pink brain colors when colors are disabled
            if (name === 'Lobe_Cerebllum_1_0' || name === 'Lobe_Cerebllum_2_0') {
              // Darker pink for cerebellum and brainstem
              mesh.material.color.setHex(0xB0627A);
            } else {
              // Medium pink for cortex
              mesh.material.color.setHex(0xD99AA8);
            }
          }
          mesh.material.emissive.setHex(0x000000);
          mesh.material.emissiveIntensity = 0;
        }
      });
      
      renderer.render(scene, camera);
    }
    animate();

    // Cleanup
    return () => {
      isMounted = false; // Prevent async brain load from completing
      
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('touchstart', handleTouchStart);
      renderer.domElement.removeEventListener('touchmove', handleTouchMove);
      renderer.domElement.removeEventListener('touchend', handleTouchEnd);
      
      // Remove ALL canvases from mount point to prevent accumulation
      if (mountRef.current) {
        while (mountRef.current.firstChild) {
          mountRef.current.removeChild(mountRef.current.firstChild);
        }
      }
      
      controls.dispose();
      renderer.dispose();
      
      // Dispose geometries and materials
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      
      // Clear refs
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      brainRef.current = null;
      meshMapRef.current.clear();
    };
  }, [onBrainClick, brainMeshes]);

  return (
    <div 
      ref={mountRef} 
      className="w-full h-full" 
      style={{ 
        position: 'relative',
        touchAction: 'none',
        userSelect: 'none'
      }}
    >
      {/* Clear Selection Button */}
      {selectedBA && (
        <button
          onClick={() => onBrainClick(null)}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-card border-2 border-border hover:bg-accent hover:border-accent-foreground/20 transition-all shadow-lg flex items-center justify-center cursor-pointer"
          aria-label="Clear selection"
          title="Clear selection"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-foreground"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

