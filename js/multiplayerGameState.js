// ============================================
// ESTADO DEL JUEGO MULTIPLAYER
// ============================================

import * as THREE from "three";
import { GAME_CONFIG } from '../config.js';

class MultiplayerGameState {
  constructor() {
    this.levelConfig = null;
    this.reset();
  }

  reset() {
    // Three.js objetos
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = null;
    
    // Datos de la sala
    this.roomId = null;
    this.localPlayerId = null;
    this.remotePlayerId = null;
    
    // Jugadores
    this.players = {
      local: {
        runner: null,
        mixer: null,
        animations: {
          run: null,
          jump: null,
          fall: null,
          current: null
        },
        isJumping: false,
        jumpVelocity: 0,
        runnerGroundY: 0,
        currentLane: GAME_CONFIG.startLane,
        targetLaneX: GAME_CONFIG.lanes[GAME_CONFIG.startLane],
        score: 0,
        fragments: 0,
        isAlive: true,
        color: 'blue' // Se asignará desde Firebase
      },
      remote: {
        runner: null,
        mixer: null,
        animations: {
          run: null,
          jump: null,
          fall: null,
          current: null
        },
        isJumping: false,
        currentLane: GAME_CONFIG.startLane,
        targetLaneX: GAME_CONFIG.lanes[GAME_CONFIG.startLane],
        score: 0,
        fragments: 0,
        isAlive: true,
        color: 'red' // Se asignará desde Firebase
      }
    };
    
    // Estado del juego
    this.isPaused = false;
    this.isGameStarted = false;
    this.isGameOver = false;
    this.winner = null;
    
    // Arrays de objetos (compartidos por ambos jugadores)
    this.obstacles = [];
    this.coins = [];
    this.powerupsGood = [];
    this.powerupsBad = [];
    this.bombs = [];
    this.groundSegments = [];
    this.trees = [];
    this.explosions = [];
    
    // Spawn tracking
    this.lastObstacleZ = GAME_CONFIG.spawnDistance;
    this.lastCoinZ = GAME_CONFIG.spawnDistance;
    this.lastPowerupGoodZ = GAME_CONFIG.spawnDistance;
    this.lastPowerupBadZ = GAME_CONFIG.spawnDistance;
    this.lastBombZ = GAME_CONFIG.spawnDistance;
    
    // Velocidad del juego
    this.gameSpeed = GAME_CONFIG.gameSpeed || 0.15;
  }
  
  setLevelConfig(config) {
    this.levelConfig = config;
    this.gameSpeed = config.gameSpeed;
    console.log('Configuración de nivel multiplayer cargada:', config.name);
  }
  
  setRoomData(roomId, localPlayerId, remotePlayerId, playerColor) {
    this.roomId = roomId;
    this.localPlayerId = localPlayerId;
    this.remotePlayerId = remotePlayerId;
    this.players.local.color = playerColor;
    this.players.remote.color = playerColor === 'blue' ? 'red' : 'blue';
    
    console.log('Datos de sala configurados:', {
      roomId,
      localPlayer: localPlayerId,
      remotePlayer: remotePlayerId,
      localColor: this.players.local.color,
      remoteColor: this.players.remote.color
    });
  }
  
  // Métodos para el jugador local
  startJump(player = 'local') {
    const p = this.players[player];
    if (p.isJumping || !this.isGameStarted || !p.isAlive) return;
    
    p.isJumping = true;
    p.jumpVelocity = Math.sqrt(2 * GAME_CONFIG.jump.gravity * GAME_CONFIG.jump.height);
    
    // Cambiar a animación de salto
    if (p.animations.jump && p.mixer) {
      if (p.animations.current) {
        p.animations.current.fadeOut(0.2);
      }
      p.animations.jump.reset().fadeIn(0.2).play();
      p.animations.current = p.animations.jump;
    }
  }
  
  updateJump(delta, player = 'local') {
    const p = this.players[player];
    if (!p.isJumping || !p.runner) return;
    
    // Física del salto
    p.jumpVelocity -= GAME_CONFIG.jump.gravity * delta;
    p.runner.position.y += p.jumpVelocity * delta;
    
    // Verificar si terminó el salto
    if (p.runner.position.y <= p.runnerGroundY) {
      p.runner.position.y = p.runnerGroundY;
      p.isJumping = false;
      p.jumpVelocity = 0;
      
      // Volver a animación de correr
      if (p.animations.run && p.mixer) {
        if (p.animations.current) {
          p.animations.current.fadeOut(0.2);
        }
        p.animations.run.reset().fadeIn(0.2).play();
        p.animations.current = p.animations.run;
      }
    }
  }
  
  changeLane(direction, player = 'local') {
    const p = this.players[player];
    if (!p.isAlive) return;
    
    if (direction === 'left' && p.currentLane > 0) {
      p.currentLane--;
      p.targetLaneX = GAME_CONFIG.lanes[p.currentLane];
    } else if (direction === 'right' && p.currentLane < GAME_CONFIG.lanes.length - 1) {
      p.currentLane++;
      p.targetLaneX = GAME_CONFIG.lanes[p.currentLane];
    }
  }
  
  addScore(points, player = 'local') {
    if (!this.players[player].isAlive) return;
    this.players[player].score += points;
  }
  
  addFragments(amount, player = 'local') {
    if (!this.players[player].isAlive) return;
    this.players[player].fragments += amount;
  }
  
  killPlayer(player = 'local') {
    const p = this.players[player];
    if (!p.isAlive) return;
    
    p.isAlive = false;
    console.log(`❌ Jugador ${player} ha muerto`);
    
    // Reproducir animación de muerte
    if (p.animations.fall && p.mixer) {
      if (p.animations.current) {
        p.animations.current.stop();
      }
      p.animations.fall.reset().play();
      p.animations.current = p.animations.fall;
    }
    
    // Terminar el juego inmediatamente para ambos
    // El que murió pierde, el otro gana
    const winner = player === 'local' ? 'remote' : 'local';
    this.declareWinner(winner);
  }
  
  checkWinner() {
    const localAlive = this.players.local.isAlive;
    const remoteAlive = this.players.remote.isAlive;
    
    // Si ambos están muertos, gana quien tenga más puntos
    if (!localAlive && !remoteAlive) {
      if (this.players.local.score > this.players.remote.score) {
        this.declareWinner('local');
      } else if (this.players.remote.score > this.players.local.score) {
        this.declareWinner('remote');
      } else {
        this.declareDraw();
      }
    }
    // Si solo uno está vivo, ese gana
    else if (localAlive && !remoteAlive) {
      this.declareWinner('local');
    } else if (!localAlive && remoteAlive) {
      this.declareWinner('remote');
    }
  }
  
  declareWinner(player) {
    if (this.isGameOver) return;
    
    this.isGameOver = true;
    this.isPaused = true;
    this.winner = player;
    
    console.log(`🏆 Ganador: ${player === 'local' ? 'TÚ' : 'OPONENTE'}`);
  }
  
  declareDraw() {
    if (this.isGameOver) return;
    
    this.isGameOver = true;
    this.isPaused = true;
    this.winner = 'draw';
    
    console.log('🤝 ¡EMPATE!');
  }
}

export default new MultiplayerGameState();