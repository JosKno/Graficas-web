// ============================================
// ARCHIVO PRINCIPAL DEL JUEGO
// ============================================

import * as THREE from "three";
import { MODEL_CONFIG } from './config.js';
import gameState from './gameState.js';
import { setupControls, setupPauseButton } from './controls.js';
import { 
  createScene, 
  createCamera, 
  createRenderer, 
  createLights,
  createGroundSegments,
  createGrassAreas,
  createLaneLines,
  createTrees,
  loadRunner
} from './sceneSetup.js';
import { spawnObjects } from './spawner.js';
import { updateAll } from './updater.js';
import { showCountdown } from './countdown.js';

let animationFrameId = null;

function init() {
  const container = document.getElementById("game-container-renderer");

  if (!container) {
    console.error('No se encontró el contenedor del juego');
    return;
  }

  // Establecer la configuración del nivel en gameState
  gameState.setLevelConfig(MODEL_CONFIG);

  // Crear reloj
  gameState.clock = new THREE.Clock();

  // Configurar escena
  createScene();
  createCamera(container);
  createRenderer(container);
  createLights();

  // Crear terreno
  createGroundSegments();
  createGrassAreas();
  createLaneLines();
  createTrees();

  // Configurar controles
  setupControls();
  setupPauseButton();

  // Cargar runner y empezar juego
  loadRunner(() => {
    // Mostrar cuenta regresiva
    setTimeout(() => {
      showCountdown(() => {
        console.log('¡Juego iniciado!');
      });
    }, 500);
  });

  // Evento resize
  window.addEventListener("resize", () => {
    if (!gameState.camera || !gameState.renderer) return;
    gameState.camera.aspect = container.clientWidth / container.clientHeight;
    gameState.camera.updateProjectionMatrix();
    gameState.renderer.setSize(container.clientWidth, container.clientHeight);
  });

  // Iniciar loop de animación
  animate();
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);
  
  if (gameState.isPaused) {
    return;
  }

  const delta = gameState.clock.getDelta();
  
  // Actualizar animaciones del runner
  if (gameState.mixer) {
    gameState.mixer.update(delta);
  }

  // Actualizar todos los objetos del juego
  updateAll(delta);

  // Generar nuevos objetos
  spawnObjects();
  
  // Renderizar escena
  if (gameState.renderer && gameState.scene && gameState.camera) {
    gameState.renderer.render(gameState.scene, gameState.camera);
  }
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Limpiar al salir
window.addEventListener('beforeunload', () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});