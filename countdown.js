// ============================================
// SISTEMA DE CUENTA REGRESIVA
// ============================================

import { GAME_CONFIG } from './config.js';
import gameState from './gameState.js';

export function showCountdown(onComplete) {
  // Crear overlay de cuenta regresiva
  const countdownOverlay = document.createElement('div');
  countdownOverlay.id = 'countdown-overlay';
  countdownOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    font-family: 'Rajdhani', sans-serif;
  `;
  
  const countdownNumber = document.createElement('div');
  countdownNumber.id = 'countdown-number';
  countdownNumber.style.cssText = `
    font-size: 120px;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.8),
                 0 0 40px rgba(255, 255, 255, 0.6);
    animation: countdownPulse 1s ease-in-out;
  `;
  
  countdownOverlay.appendChild(countdownNumber);
  document.body.appendChild(countdownOverlay);
  
  // Agregar animación CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes countdownPulse {
      0% {
        transform: scale(0.5);
        opacity: 0;
      }
      50% {
        transform: scale(1.2);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    @keyframes countdownFadeOut {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  
  let currentCount = GAME_CONFIG.countdown.startValue;
  countdownNumber.textContent = currentCount;
  
  const countdownInterval = setInterval(() => {
    currentCount--;
    
    if (currentCount > 0) {
      countdownNumber.textContent = currentCount;
      // Reiniciar animación
      countdownNumber.style.animation = 'none';
      setTimeout(() => {
        countdownNumber.style.animation = 'countdownPulse 1s ease-in-out';
      }, 10);
    } else {
      // Mostrar "GO!"
      countdownNumber.textContent = '¡GO!';
      countdownNumber.style.animation = 'countdownFadeOut 0.5s ease-out';
      
      setTimeout(() => {
        document.body.removeChild(countdownOverlay);
        gameState.isGameStarted = true;
        
        // Iniciar animación de correr
        if (gameState.animations.run) {
          gameState.animations.run.play();
        }
        
        if (onComplete) onComplete();
      }, 500);
      
      clearInterval(countdownInterval);
    }
  }, 1000);
}