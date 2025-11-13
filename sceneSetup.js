// ============================================
// CONFIGURACIÓN DE LA ESCENA 3D
// ============================================

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GAME_CONFIG } from './config.js';
import gameState from './gameState.js';

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

export function createScene() {
  gameState.scene = new THREE.Scene();
  
  // Obtener configuración del nivel actual desde gameState
  const levelConfig = gameState.levelConfig;
  
  // Cargar imagen de fondo
  textureLoader.load(
    levelConfig.background,
    (texture) => {
      gameState.scene.background = texture;
      console.log('Fondo cargado correctamente');
    },
    undefined,
    (error) => {
      console.log('No se pudo cargar el fondo, usando color por defecto');
      gameState.scene.background = new THREE.Color(levelConfig.fog.color);
    }
  );
  
  gameState.scene.fog = new THREE.Fog(
    levelConfig.fog.color, 
    levelConfig.fog.near, 
    levelConfig.fog.far
  );
}

export function createCamera(container) {
  gameState.camera = new THREE.PerspectiveCamera(
    GAME_CONFIG.camera.fov,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  gameState.camera.position.set(
    GAME_CONFIG.camera.position.x,
    GAME_CONFIG.camera.position.y,
    GAME_CONFIG.camera.position.z
  );
  gameState.camera.lookAt(
    GAME_CONFIG.camera.lookAt.x,
    GAME_CONFIG.camera.lookAt.y,
    GAME_CONFIG.camera.lookAt.z
  );
}

export function createRenderer(container) {
  gameState.renderer = new THREE.WebGLRenderer({ antialias: true });
  gameState.renderer.setSize(container.clientWidth, container.clientHeight);
  gameState.renderer.shadowMap.enabled = true;
  gameState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(gameState.renderer.domElement);
}

export function createLights() {
  const levelConfig = gameState.levelConfig;
  
  // Luz hemisférica base
  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x8B7355, 0.6);
  gameState.scene.add(hemisphereLight);

  // Luz direccional principal
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  gameState.scene.add(directionalLight);
  
  // Efectos especiales para nivel neón (Ciudad)
  if (levelConfig.neonEffect) {
    // Luz ambiental morada para ambiente cyberpunk
    const ambientNeon = new THREE.AmbientLight(
      levelConfig.ambientLightColor, 
      levelConfig.ambientLightIntensity
    );
    gameState.scene.add(ambientNeon);
    
    // Luces puntuales cyan para simular neones
    const pointLight1 = new THREE.PointLight(0x00ffff, 1, 50);
    pointLight1.position.set(-5, 3, -10);
    gameState.scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xff00ff, 1, 50);
    pointLight2.position.set(5, 3, -10);
    gameState.scene.add(pointLight2);
    
    console.log('Efectos neón activados');
  }
}

export function createGroundSegments() {
  const levelConfig = gameState.levelConfig;
  
  // Pista principal
  const segmentGeometry = new THREE.PlaneGeometry(8, 50);
  const segmentMaterial = new THREE.MeshStandardMaterial({ 
    color: levelConfig.terrain.road,
    roughness: 0.9,
    metalness: 0.1
  });

  for (let i = 0; i < 5; i++) {
    const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
    segment.rotateX(-Math.PI / 2);
    segment.position.z = i * 50 - 50;
    segment.receiveShadow = true;
    gameState.scene.add(segment);
    gameState.groundSegments.push(segment);
  }
}

export function createGrassAreas() {
  const levelConfig = gameState.levelConfig;
  
  const grassGeometry = new THREE.PlaneGeometry(10, 50);
  const grassMaterial = new THREE.MeshStandardMaterial({ 
    color: levelConfig.terrain.grass,
    roughness: 1.0
  });

  for (let i = 0; i < 5; i++) {
    // Lateral izquierdo
    const grassLeft = new THREE.Mesh(grassGeometry, grassMaterial);
    grassLeft.rotateX(-Math.PI / 2);
    grassLeft.position.set(-9, -0.01, i * 50 - 50);
    grassLeft.receiveShadow = true;
    gameState.scene.add(grassLeft);
    gameState.groundSegments.push(grassLeft);

    // Lateral derecho
    const grassRight = new THREE.Mesh(grassGeometry, grassMaterial);
    grassRight.rotateX(-Math.PI / 2);
    grassRight.position.set(9, -0.01, i * 50 - 50);
    grassRight.receiveShadow = true;
    gameState.scene.add(grassRight);
    gameState.groundSegments.push(grassRight);
  }
}

export function createLaneLines() {
  const levelConfig = gameState.levelConfig;
  
  const lineGeometry = new THREE.BoxGeometry(0.2, 0.05, 3);
  const lineMaterial = new THREE.MeshStandardMaterial({ 
    color: levelConfig.terrain.lines,
    emissive: levelConfig.terrain.lines,
    emissiveIntensity: 0.3
  });
  
  for (let i = 0; i < 30; i++) {
    const leftLine = new THREE.Mesh(lineGeometry, lineMaterial);
    leftLine.position.set(-1.5, 0.05, i * -8);
    gameState.scene.add(leftLine);
    gameState.obstacles.push({ mesh: leftLine, type: 'decoration' });

    const rightLine = new THREE.Mesh(lineGeometry, lineMaterial);
    rightLine.position.set(1.5, 0.05, i * -8);
    gameState.scene.add(rightLine);
    gameState.obstacles.push({ mesh: rightLine, type: 'decoration' });
  }
}

function spawnTree(xPos, zPos) {
  const levelConfig = gameState.levelConfig;
  
  loader.load(
    levelConfig.tree.path,
    (model) => {
      const tree = model.scene.clone();
      tree.scale.set(
        levelConfig.tree.scale.x,
        levelConfig.tree.scale.y,
        levelConfig.tree.scale.z
      );
      tree.position.set(xPos, levelConfig.tree.yOffset, zPos);
      
      tree.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Agregar brillo si está configurado (para nivel 2)
          if (levelConfig.tree.emissiveColor !== undefined && child.material) {
            child.material.emissive = new THREE.Color(levelConfig.tree.emissiveColor);
            child.material.emissiveIntensity = levelConfig.tree.emissiveIntensity;
          }
        }
      });
      
      gameState.scene.add(tree);
      gameState.trees.push({ mesh: tree, x: xPos });
    },
    undefined,
    (error) => {
      // Árbol temporal si no se puede cargar
      const tempTreeGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
      const tempTreeMaterial = new THREE.MeshStandardMaterial({ color: "#8B4513" });
      const tempTree = new THREE.Mesh(tempTreeGeometry, tempTreeMaterial);
      tempTree.position.set(xPos, 1.5, zPos);
      
      const foliageGeometry = new THREE.SphereGeometry(1.5, 8, 8);
      const foliageMaterial = new THREE.MeshStandardMaterial({ color: "#228B22" });
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.y = 2;
      tempTree.add(foliage);
      
      tempTree.castShadow = true;
      tempTree.receiveShadow = true;
      
      gameState.scene.add(tempTree);
      gameState.trees.push({ mesh: tempTree, x: xPos });
    }
  );
}

export function createTrees() {
  const treePositions = [
    { x: -9, side: 'left' },   // Solo uno a la izquierda
    { x: 9, side: 'right' }    // Solo uno a la derecha
  ];

  for (let z = 0; z > -200; z -= 15) {
    treePositions.forEach(pos => {
      spawnTree(pos.x, z);
    });
  }
}

export function loadRunner(onComplete) {
  const levelConfig = gameState.levelConfig;
  
  loader.load(
    levelConfig.runner.path,
    (model) => {
      gameState.runner = model.scene;
      gameState.runner.scale.set(
        levelConfig.runner.scale.x,
        levelConfig.runner.scale.y,
        levelConfig.runner.scale.z
      );
      gameState.runner.position.set(
        GAME_CONFIG.lanes[GAME_CONFIG.startLane], 
        levelConfig.runner.yOffset, 
        5
      );
      gameState.runner.rotation.y = Math.PI;
      gameState.runnerGroundY = levelConfig.runner.yOffset;
      
      gameState.runner.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      gameState.scene.add(gameState.runner);
      console.log('Modelo runner cargado');

      // Configurar animaciones
      if (model.animations && model.animations.length > 0) {
        gameState.mixer = new THREE.AnimationMixer(gameState.runner);
        
        // Buscar animación de correr
        const runAnimation = model.animations.find(anim => 
          anim.name.toLowerCase().includes('run') 
        );
        
        // Buscar animación de saltar
        const jumpAnimation = model.animations.find(anim => 
          anim.name.toLowerCase().includes('jump') 
        );
        
        if (runAnimation) {
          gameState.animations.run = gameState.mixer.clipAction(runAnimation);
          gameState.animations.current = gameState.animations.run;
          console.log('Animación de correr encontrada:', runAnimation.name);
        } else if (model.animations[0]) {
          gameState.animations.run = gameState.mixer.clipAction(model.animations[0]);
          gameState.animations.current = gameState.animations.run;
          console.log('Usando primera animación como correr');
        }
        
        if (jumpAnimation) {
          gameState.animations.jump = gameState.mixer.clipAction(jumpAnimation);
          gameState.animations.jump.setLoop(THREE.LoopOnce);
          gameState.animations.jump.clampWhenFinished = true;
          console.log('Animación de saltar encontrada:', jumpAnimation.name);
        }
        
        console.log('Animaciones disponibles:', model.animations.map(a => a.name));
      }
      
      if (onComplete) onComplete();
    },
    undefined,
    (error) => {
      console.error('Error cargando runner:', error);
      if (onComplete) onComplete();
    }
  );
}