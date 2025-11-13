// ============================================
// SISTEMA DE SPAWN DE OBJETOS
// ============================================

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GAME_CONFIG } from './config.js';
import gameState from './gameState.js';

const loader = new GLTFLoader();

// Función para agregar brillo a un modelo
function addEmissiveToModel(model, color, intensity) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      
      // Agregar brillo propio
      if (child.material) {
        child.material.emissive = new THREE.Color(color);
        child.material.emissiveIntensity = intensity;
      }
    }
  });
}

export function spawnObstacle() {
  const levelConfig = gameState.levelConfig;
  
  loader.load(
    levelConfig.obstacle.path,
    (model) => {
      const obstacle = model.scene;
      obstacle.scale.set(
        levelConfig.obstacle.scale.x,
        levelConfig.obstacle.scale.y,
        levelConfig.obstacle.scale.z
      );
      
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      obstacle.position.set(
        randomLane, 
        levelConfig.obstacle.yOffset, 
        GAME_CONFIG.spawnDistance
      );
      
      obstacle.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      // Agregar brillo si está configurado (para nivel 2)
      if (levelConfig.obstacle.emissiveColor !== undefined) {
        addEmissiveToModel(obstacle, levelConfig.obstacle.emissiveColor, levelConfig.obstacle.emissiveIntensity);
      }
      
      gameState.scene.add(obstacle);
      gameState.obstacles.push({ mesh: obstacle, type: 'obstacle', lane: randomLane });
      gameState.lastObstacleZ = GAME_CONFIG.spawnDistance;
    },
    undefined,
    (error) => {
      console.warn('No se pudo cargar obstáculo, usando fallback');
      const tempGeometry = new THREE.BoxGeometry(1.5, 2, 1.5);
      const tempMaterial = new THREE.MeshStandardMaterial({ color: "#ff4757" });
      const tempObstacle = new THREE.Mesh(tempGeometry, tempMaterial);
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      tempObstacle.position.set(randomLane, 1, GAME_CONFIG.spawnDistance);
      tempObstacle.castShadow = true;
      gameState.scene.add(tempObstacle);
      gameState.obstacles.push({ mesh: tempObstacle, type: 'obstacle', lane: randomLane });
      gameState.lastObstacleZ = GAME_CONFIG.spawnDistance;
    }
  );
}

export function spawnCoin() {
  const levelConfig = gameState.levelConfig;
  
  loader.load(
    levelConfig.coin.path,
    (model) => {
      const coin = model.scene;
      coin.scale.set(
        levelConfig.coin.scale.x,
        levelConfig.coin.scale.y,
        levelConfig.coin.scale.z
      );
      
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      coin.position.set(
        randomLane, 
        levelConfig.coin.yOffset, 
        GAME_CONFIG.spawnDistance
      );
      
      // Agregar brillo a la moneda
      addEmissiveToModel(coin, levelConfig.coin.emissiveColor, levelConfig.coin.emissiveIntensity);
      
      gameState.scene.add(coin);
      gameState.coins.push({ 
        mesh: coin, 
        type: 'coin', 
        lane: randomLane, 
        rotation: 0,
        shouldRotate: levelConfig.coin.rotate 
      });
      gameState.lastCoinZ = GAME_CONFIG.spawnDistance;
    },
    undefined,
    (error) => {
      console.warn('No se pudo cargar moneda, usando fallback');
      const tempGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16);
      const tempMaterial = new THREE.MeshStandardMaterial({ 
        color: "#ffd700",
        metalness: 0.8,
        emissive: 0xffd700,
        emissiveIntensity: 1.5
      });
      const tempCoin = new THREE.Mesh(tempGeometry, tempMaterial);
      tempCoin.rotation.x = Math.PI / 2;
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      tempCoin.position.set(randomLane, 1, GAME_CONFIG.spawnDistance);
      tempCoin.castShadow = true;
      gameState.scene.add(tempCoin);
      gameState.coins.push({ 
        mesh: tempCoin, 
        type: 'coin', 
        lane: randomLane, 
        rotation: 0,
        shouldRotate: true 
      });
      gameState.lastCoinZ = GAME_CONFIG.spawnDistance;
    }
  );
}

export function spawnPowerupGood() {
  const levelConfig = gameState.levelConfig;
  
  loader.load(
    levelConfig.powerupGood.path,
    (model) => {
      const powerup = model.scene;
      powerup.scale.set(
        levelConfig.powerupGood.scale.x,
        levelConfig.powerupGood.scale.y,
        levelConfig.powerupGood.scale.z
      );
      
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      powerup.position.set(
        randomLane, 
        levelConfig.powerupGood.yOffset, 
        GAME_CONFIG.spawnDistance
      );
      
      // Agregar brillo verde intenso
      addEmissiveToModel(powerup, levelConfig.powerupGood.emissiveColor, levelConfig.powerupGood.emissiveIntensity);
      
      gameState.scene.add(powerup);
      gameState.powerupsGood.push({ 
        mesh: powerup, 
        type: 'powerupGood', 
        lane: randomLane, 
        rotation: 0,
        shouldFloat: levelConfig.powerupGood.float,
        baseY: levelConfig.powerupGood.yOffset
      });
      gameState.lastPowerupGoodZ = GAME_CONFIG.spawnDistance;
    },
    undefined,
    (error) => {
      console.warn('No se pudo cargar powerup bueno, usando fallback');
      const tempGeometry = new THREE.OctahedronGeometry(0.7);
      const tempMaterial = new THREE.MeshStandardMaterial({ 
        color: "#00ff00",
        emissive: 0x00ff00,
        emissiveIntensity: 2.0
      });
      const tempPowerup = new THREE.Mesh(tempGeometry, tempMaterial);
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      tempPowerup.position.set(randomLane, 1.5, GAME_CONFIG.spawnDistance);
      tempPowerup.castShadow = true;
      gameState.scene.add(tempPowerup);
      gameState.powerupsGood.push({ 
        mesh: tempPowerup, 
        type: 'powerupGood', 
        lane: randomLane, 
        rotation: 0,
        shouldFloat: true,
        baseY: 1.5
      });
      gameState.lastPowerupGoodZ = GAME_CONFIG.spawnDistance;
    }
  );
}

export function spawnPowerupBad() {
  const levelConfig = gameState.levelConfig;
  
  loader.load(
    levelConfig.powerupBad.path,
    (model) => {
      const powerup = model.scene;
      powerup.scale.set(
        levelConfig.powerupBad.scale.x,
        levelConfig.powerupBad.scale.y,
        levelConfig.powerupBad.scale.z
      );
      
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      powerup.position.set(
        randomLane, 
        levelConfig.powerupBad.yOffset, 
        GAME_CONFIG.spawnDistance
      );
      
      // Agregar brillo rojo intenso
      addEmissiveToModel(powerup, levelConfig.powerupBad.emissiveColor, levelConfig.powerupBad.emissiveIntensity);
      
      gameState.scene.add(powerup);
      gameState.powerupsBad.push({ 
        mesh: powerup, 
        type: 'powerupBad', 
        lane: randomLane, 
        rotation: 0,
        shouldFloat: levelConfig.powerupBad.float,
        baseY: levelConfig.powerupBad.yOffset
      });
    },
    undefined,
    (error) => {
      console.warn('No se pudo cargar powerup malo, usando fallback');
      const tempGeometry = new THREE.OctahedronGeometry(0.7);
      const tempMaterial = new THREE.MeshStandardMaterial({ 
        color: "#ff0000",
        emissive: 0xff0000,
        emissiveIntensity: 2.0
      });
      const tempPowerup = new THREE.Mesh(tempGeometry, tempMaterial);
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      tempPowerup.position.set(randomLane, 1.5, GAME_CONFIG.spawnDistance);
      tempPowerup.castShadow = true;
      gameState.scene.add(tempPowerup);
      gameState.powerupsBad.push({ 
        mesh: tempPowerup, 
        type: 'powerupBad', 
        lane: randomLane, 
        rotation: 0,
        shouldFloat: true,
        baseY: 1.5
      });
    }
  );
}

export function spawnBomb() {
  const levelConfig = gameState.levelConfig;
  
  loader.load(
    levelConfig.bomb.path,
    (model) => {
      const bomb = model.scene;
      bomb.scale.set(
        levelConfig.bomb.scale.x,
        levelConfig.bomb.scale.y,
        levelConfig.bomb.scale.z
      );
      
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      bomb.position.set(
        randomLane, 
        levelConfig.bomb.yOffset, 
        GAME_CONFIG.spawnDistance
      );
      
      // Agregar brillo rojo intenso a la bomba
      addEmissiveToModel(bomb, levelConfig.bomb.emissiveColor, levelConfig.bomb.emissiveIntensity);
      
      gameState.scene.add(bomb);
      gameState.bombs.push({ 
        mesh: bomb, 
        type: 'bomb', 
        lane: randomLane, 
        rotation: 0
      });
    },
    undefined,
    (error) => {
      console.warn('No se pudo cargar bomba, usando fallback');
      const tempGeometry = new THREE.SphereGeometry(0.6, 16, 16);
      const tempMaterial = new THREE.MeshStandardMaterial({ 
        color: "#000000",
        emissive: 0xff0000,
        emissiveIntensity: 2.0
      });
      const tempBomb = new THREE.Mesh(tempGeometry, tempMaterial);
      const randomLane = GAME_CONFIG.lanes[Math.floor(Math.random() * GAME_CONFIG.lanes.length)];
      tempBomb.position.set(randomLane, 1, GAME_CONFIG.spawnDistance);
      tempBomb.castShadow = true;
      gameState.scene.add(tempBomb);
      gameState.bombs.push({ 
        mesh: tempBomb, 
        type: 'bomb', 
        lane: randomLane, 
        rotation: 0
      });
    }
  );
}

export function spawnObjects() {
  if (!gameState.isGameStarted || !gameState.levelConfig || gameState.isGameOver) return;
  
  const spawnRates = gameState.levelConfig.spawnRates;
  
  // Spawn obstáculos
  if (Math.random() < spawnRates.obstacle) {
    spawnObstacle();
  }

  // Spawn monedas
  if (Math.random() < spawnRates.coin) {
    spawnCoin();
  }

  // Spawn powerups buenos (MUY RAROS)
  if (Math.random() < spawnRates.powerupGood) {
    spawnPowerupGood();
  }

  // Spawn powerups malos (MUY RAROS)
  if (Math.random() < spawnRates.powerupBad) {
    spawnPowerupBad();
  }
  
  // Spawn bombas (EXTREMADAMENTE RAROS)
  if (Math.random() < spawnRates.bomb) {
    spawnBomb();
  }
}