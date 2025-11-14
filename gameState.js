// ============================================
// ESTADO DEL JUEGO
// ============================================

import * as THREE from "three";
import { GAME_CONFIG } from './config.js';

class GameState {
  constructor() {
    this.levelConfig = null; // Configuración del nivel actual
    this.reset();
  }

  reset() {
    // Three.js objetos
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.mixer = null;
    this.runner = null;
    this.clock = null;
    
    // Animaciones del runner
    this.animations = {
      run: null,
      jump: null,
      fall: null,
      current: null
    };
    
    // Estado del juego
    this.isPaused = false;
    this.isGameStarted = false;
    this.isGameOver = false;
    this.isJumping = false;
    this.jumpVelocity = 0;
    this.runnerGroundY = 0;
    
    // Carriles
    this.currentLane = GAME_CONFIG.startLane;
    this.targetLaneX = GAME_CONFIG.lanes[GAME_CONFIG.startLane];
    
    // Arrays de objetos
    this.obstacles = [];
    this.coins = [];
    this.powerupsGood = [];
    this.powerupsBad = [];
    this.bombs = [];
    this.groundSegments = [];
    this.trees = [];
    this.explosions = [];
    
    // Puntuación
    this.score = 0;
    this.fragments = 0;
    
    // Spawn tracking
    this.lastObstacleZ = GAME_CONFIG.spawnDistance;
    this.lastCoinZ = GAME_CONFIG.spawnDistance;
    this.lastPowerupGoodZ = GAME_CONFIG.spawnDistance;
    this.lastPowerupBadZ = GAME_CONFIG.spawnDistance;
    this.lastBombZ = GAME_CONFIG.spawnDistance;
    
    // Velocidad del juego (se actualiza desde levelConfig)
    this.gameSpeed = GAME_CONFIG.gameSpeed || 0.15;
  }
  
  setLevelConfig(config) {
    this.levelConfig = config;
    this.gameSpeed = config.gameSpeed;
    console.log('Configuración de nivel cargada:', config.name);
  }
  
  playDeathAnimation(callback) {
    if (!this.mixer || !this.animations.fall) {
      console.log('No hay animación de caída, ejecutando callback inmediatamente');
      if (callback) callback();
      return;
    }
    
    // Detener animación actual
    if (this.animations.current) {
      this.animations.current.stop();
    }
    
    // Reproducir animación de caída una sola vez
    this.animations.fall.reset();
    this.animations.fall.setLoop(THREE.LoopOnce);
    this.animations.fall.clampWhenFinished = true;
    this.animations.fall.play();
    this.animations.current = this.animations.fall;
    
    console.log('Reproduciendo animación de muerte');
    
    // Esperar a que termine la animación
    const duration = this.animations.fall.getClip().duration;
    setTimeout(() => {
      console.log('Animación de muerte completada');
      if (callback) callback();
    }, duration * 1000); // Convertir a milisegundos
  }
  
  updateScore(points) {
    this.score = Math.max(0, this.score + points);
    this.updateHUD();
  }
  
  updateFragments(amount) {
    this.fragments += amount;
    this.updateHUD();
  }
  
  updateHUD() {
    const scoreElement = document.getElementById('score');
    const fragmentsElement = document.getElementById('fragments');
    
    if (scoreElement) scoreElement.textContent = this.score;
    if (fragmentsElement) fragmentsElement.textContent = this.fragments;
  }
  
  showHUDEffect(text, color = '#00ff00') {
    const effectsElement = document.getElementById('effects');
    if (!effectsElement) return;
    
    effectsElement.textContent = text;
    effectsElement.style.color = color;
    effectsElement.style.fontWeight = '700';
    effectsElement.style.textShadow = `0 0 10px ${color}`;
    effectsElement.style.animation = 'hudPulse 0.3s ease-out';
    
    // Limpiar después de 1.5 segundos
    setTimeout(() => {
      effectsElement.textContent = '';
      effectsElement.style.animation = '';
    }, 1500);
  }
  
  startJump() {
    if (this.isJumping || !this.isGameStarted) return;
    
    this.isJumping = true;
    this.jumpVelocity = Math.sqrt(2 * GAME_CONFIG.jump.gravity * GAME_CONFIG.jump.height);
    
    // Cambiar a animación de salto
    if (this.animations.jump && this.mixer) {
      if (this.animations.current) {
        this.animations.current.fadeOut(0.2);
      }
      this.animations.jump.reset().fadeIn(0.2).play();
      this.animations.current = this.animations.jump;
    }
  }
  
  updateJump(delta) {
    if (!this.isJumping || !this.runner) return;
    
    // Física del salto
    this.jumpVelocity -= GAME_CONFIG.jump.gravity * delta;
    this.runner.position.y += this.jumpVelocity * delta;
    
    // Verificar si terminó el salto
    if (this.runner.position.y <= this.runnerGroundY) {
      this.runner.position.y = this.runnerGroundY;
      this.isJumping = false;
      this.jumpVelocity = 0;
      
      // Volver a animación de correr
      if (this.animations.run && this.mixer) {
        if (this.animations.current) {
          this.animations.current.fadeOut(0.2);
        }
        this.animations.run.reset().fadeIn(0.2).play();
        this.animations.current = this.animations.run;
      }
    }
  }
  
  changeLane(direction) {
    if (direction === 'left' && this.currentLane > 0) {
      this.currentLane--;
      this.targetLaneX = GAME_CONFIG.lanes[this.currentLane];
    } else if (direction === 'right' && this.currentLane < GAME_CONFIG.lanes.length - 1) {
      this.currentLane++;
      this.targetLaneX = GAME_CONFIG.lanes[this.currentLane];
    }
  }
}

export default new GameState();