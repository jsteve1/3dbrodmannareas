import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5);
scene.add(light);

const loader = new GLTFLoader();
loader.load('brain_segmented2.glb', (gltf) => {
  const brain = gltf.scene;
  brain.scale.setScalar(0.5); // adjust if too big/small
  
  // Clone materials so each mesh is independent and give unique colors
  brain.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material = child.material.clone();
      // Give each BA a unique random color
      child.material.color.setHSL(Math.random(), 0.7, 0.6);
    }
  });
  
  scene.add(brain);
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

addEventListener('click', (event) => {
  mouse.x = (event.clientX / innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const clicked = intersects[0].object;
    console.log('Clicked:', clicked.name || 'unnamed mesh');
    
    // Flash it red briefly so you can see what you hit
    const originalColor = clicked.material.color?.clone();
    if (clicked.material.color) {
      clicked.material.color.set(0xff0000);
      setTimeout(() => {
        clicked.material.color.copy(originalColor);
      }, 300);
    }
  }
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();