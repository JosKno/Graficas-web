// ============================================
// SETUP DE ESCENA PARA MULTIPLAYER
// ============================================

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GAME_CONFIG } from '../config.js';
import mpGameState from './multiplayerGameState.js';

const loader = new GLTFLoader();

// ============================================
// CARGAR RUNNER MULTIPLAYER CON COLOR
// ============================================
export function loadRunnerMultiplayer(playerType, color, onComplete) {
  const levelConfig = mpGameState.levelConfig;
  const player = mpGameState.players[playerType];
  
  loader.load(
    levelConfig.runner.path,
    (model) => {
      player.runner = model.scene;
      player.runner.scale.set(
        levelConfig.runner.scale.x,
        levelConfig.runner.scale.y,
        levelConfig.runner.scale.z
      );
      
      // Posicionar según el COLOR (no el tipo)
      // Azul = carril izquierdo (0), Rojo = carril derecho (2)
      const startLane = color === 'blue' ? 0 : 2;
      player.currentLane = startLane;
      player.targetLaneX = GAME_CONFIG.lanes[startLane];
      
      player.runner.position.set(
        GAME_CONFIG.lanes[startLane], 
        levelConfig.runner.yOffset, 
        5
      );
      player.runner.rotation.y = Math.PI;
      player.runnerGroundY = levelConfig.runner.yOffset;
      
      // Aplicar color al modelo
      applyColorToRunner(player.runner, color);
      
      player.runner.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      mpGameState.scene.add(player.runner);
      console.log(`Modelo runner ${playerType} (${color}) cargado`);

      // Configurar animaciones
      if (model.animations && model.animations.length > 0) {
        player.mixer = new THREE.AnimationMixer(player.runner);
        
        // Buscar animación de correr
        const runAnimation = model.animations.find(anim => 
          anim.name.toLowerCase().includes('run') 
        );
        
        // Buscar animación de saltar
        const jumpAnimation = model.animations.find(anim => 
          anim.name.toLowerCase().includes('jump')
        );
        
        // Buscar animación de caída/muerte
        const fallAnimation = model.animations.find(anim => 
          anim.name.toLowerCase().includes('roll')
        );
        
        if (runAnimation) {
          player.animations.run = player.mixer.clipAction(runAnimation);
          player.animations.current = player.animations.run;
          player.animations.run.play();
          console.log(`Animación de correr para ${playerType}:`, runAnimation.name);
        } else if (model.animations[0]) {
          player.animations.run = player.mixer.clipAction(model.animations[0]);
          player.animations.current = player.animations.run;
          player.animations.run.play();
          console.log(`Usando primera animación como correr para ${playerType}`);
        }
        
        if (jumpAnimation) {
          player.animations.jump = player.mixer.clipAction(jumpAnimation);
          player.animations.jump.setLoop(THREE.LoopOnce);
          player.animations.jump.clampWhenFinished = true;
          console.log(`Animación de saltar para ${playerType}:`, jumpAnimation.name);
        }
        
        if (fallAnimation) {
          player.animations.fall = player.mixer.clipAction(fallAnimation);
          player.animations.fall.setLoop(THREE.LoopOnce);
          player.animations.fall.clampWhenFinished = true;
          console.log(`Animación de caída para ${playerType}:`, fallAnimation.name);
        }
      }
      
      if (onComplete) onComplete();
    },
    undefined,
    (error) => {
      console.error(`Error cargando runner ${playerType}:`, error);
      if (onComplete) onComplete();
    }
  );
}

// ============================================
// APLICAR COLOR AL RUNNER
// ============================================
function applyColorToRunner(runner, color) {
  const colorMap = {
    'blue': new THREE.Color(0x0099ff),   // Azul brillante
    'red': new THREE.Color(0xff4444)     // Rojo brillante
  };
  
  const targetColor = colorMap[color] || colorMap['blue'];
  
  runner.traverse((child) => {
    if (child.isMesh && child.material) {
      // Clonar material para no afectar a otros meshes
      child.material = child.material.clone();
      
      // Aplicar color con efecto de tinte
      if (child.material.color) {
        // Mezclar el color original con el color del jugador
        child.material.color.lerp(targetColor, 0.6);
      }
      
      // Añadir brillo emissive para que se vea más el color
      if (child.material.emissive !== undefined) {
        child.material.emissive = targetColor.clone().multiplyScalar(0.3);
        child.material.emissiveIntensity = 0.5;
      }
      
      child.material.needsUpdate = true;
    }
  });
  
  console.log(`✅ Color ${color} aplicado al runner`);
}