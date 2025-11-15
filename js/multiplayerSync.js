// ============================================
// SINCRONIZACIÓN MULTIPLAYER CON FIREBASE
// ============================================

import { 
    ref, 
    update, 
    onValue, 
    off 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

class MultiplayerSync {
    constructor() {
        this.db = null;
        this.roomId = null;
        this.localPlayerId = null;
        this.remotePlayerId = null;
        this.listeners = {};
        
        // Throttling para evitar demasiadas actualizaciones
        this.lastUpdate = 0;
        this.updateInterval = 16; // ms (~60 FPS en lugar de 20)
        
        this.isInitialized = false;
    }

    // ============================================
    // INICIALIZACIÓN
    // ============================================
    initialize(database, roomId, localPlayerId, remotePlayerId) {
        this.db = database;
        this.roomId = roomId;
        this.localPlayerId = localPlayerId;
        this.remotePlayerId = remotePlayerId;
        this.isInitialized = true;
        
        console.log('✅ MultiplayerSync inicializado:', {
            roomId,
            localPlayer: localPlayerId,
            remotePlayer: remotePlayerId
        });
    }

    // ============================================
    // ACTUALIZAR POSICIÓN DEL JUGADOR LOCAL
    // ============================================
    updateLocalPosition(x, y, z, lane, isJumping) {
        if (!this.isInitialized) return;
        
        // Throttling
        const now = Date.now();
        if (now - this.lastUpdate < this.updateInterval) {
            return;
        }
        this.lastUpdate = now;
        
        const playerRef = ref(this.db, `rooms/${this.roomId}/players/${this.localPlayerId}/position`);
        
        update(playerRef, {
            x: parseFloat(x.toFixed(2)),
            y: parseFloat(y.toFixed(2)),
            z: parseFloat(z.toFixed(2))
        }).catch(error => {
            console.error('Error actualizando posición:', error);
        });
        
        // Actualizar carril y estado de salto
        const stateRef = ref(this.db, `rooms/${this.roomId}/players/${this.localPlayerId}`);
        update(stateRef, {
            lane: lane,
            isJumping: isJumping
        }).catch(error => {
            console.error('Error actualizando estado:', error);
        });
    }

    // ============================================
    // ACTUALIZAR PUNTUACIÓN DEL JUGADOR LOCAL
    // ============================================
    updateLocalScore(score, fragments) {
        if (!this.isInitialized) return;
        
        const playerRef = ref(this.db, `rooms/${this.roomId}/players/${this.localPlayerId}`);
        
        update(playerRef, {
            score: score,
            fragments: fragments
        }).catch(error => {
            console.error('Error actualizando puntuación:', error);
        });
    }

    // ============================================
    // NOTIFICAR COLISIÓN/MUERTE DEL JUGADOR LOCAL
    // ============================================
    updateLocalAliveStatus(isAlive) {
        if (!this.isInitialized) return;
        
        const playerRef = ref(this.db, `rooms/${this.roomId}/players/${this.localPlayerId}`);
        
        update(playerRef, {
            isAlive: isAlive
        }).catch(error => {
            console.error('Error actualizando estado de vida:', error);
        });
    }

    // ============================================
    // ESCUCHAR POSICIÓN DEL JUGADOR REMOTO
    // ============================================
    listenToRemotePlayer(onUpdate) {
        if (!this.isInitialized) return;
        
        const remotePlayerRef = ref(this.db, `rooms/${this.roomId}/players/${this.remotePlayerId}`);
        
        const listener = onValue(remotePlayerRef, (snapshot) => {
            const data = snapshot.val();
            if (data && onUpdate) {
                onUpdate(data);
            }
        });
        
        this.listeners.remotePlayer = { ref: remotePlayerRef, listener };
        
        console.log('👂 Escuchando al jugador remoto:', this.remotePlayerId);
    }

    // ============================================
    // ESCUCHAR ESTADO GENERAL DE LA SALA
    // ============================================
    listenToRoomStatus(onStatusChange) {
        if (!this.isInitialized) return;
        
        const roomRef = ref(this.db, `rooms/${this.roomId}`);
        
        const listener = onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data && onStatusChange) {
                onStatusChange(data);
            }
        });
        
        this.listeners.roomStatus = { ref: roomRef, listener };
        
        console.log('👂 Escuchando estado de la sala');
    }

    // ============================================
    // DECLARAR GANADOR
    // ============================================
    async declareWinner(winnerId) {
        if (!this.isInitialized) return;
        
        const roomRef = ref(this.db, `rooms/${this.roomId}`);
        
        try {
            await update(roomRef, {
                status: 'finished',
                winner: winnerId,
                finishedAt: Date.now()
            });
            
            console.log('🏆 Ganador declarado:', winnerId);
        } catch (error) {
            console.error('Error declarando ganador:', error);
        }
    }

    // ============================================
    // LIMPIAR LISTENERS AL SALIR
    // ============================================
    cleanup() {
        // Detener todos los listeners
        Object.values(this.listeners).forEach(({ ref: dbRef }) => {
            off(dbRef);
        });
        
        this.listeners = {};
        this.isInitialized = false;
        
        console.log('🧹 MultiplayerSync limpiado');
    }
}

// Instancia singleton
const multiplayerSync = new MultiplayerSync();

export function getMultiplayerSync() {
    return multiplayerSync;
}

export default multiplayerSync;