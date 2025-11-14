// ============================================
// CLIENTE PARA CONSUMIR API DE PUNTUACIONES
// ============================================

const API_URL = 'http://localhost/Pantallas/api/puntuaciones.php';

class PuntuacionesAPI {
  
  // Obtener top 5 de un nivel específico
  static async getTopPorNivel(nivel) {
    try {
      const response = await fetch(`${API_URL}?action=top&nivel=${nivel}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message);
      }
      
      return data.puntuaciones;
    } catch (error) {
      console.error('Error al obtener puntuaciones:', error);
      return [];
    }
  }
  
  // Obtener top 5 de todos los niveles
  static async getAllTop() {
    try {
      const response = await fetch(`${API_URL}?action=all_top`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message);
      }
      
      return data.puntuaciones;
    } catch (error) {
      console.error('Error al obtener todas las puntuaciones:', error);
      return null;
    }
  }
  
  // Guardar nueva puntuación
  static async guardarPuntuacion(nivel, puntuacion, fragmentos, nombreJugador, firebaseUid = null) {
    try {
      const response = await fetch(`${API_URL}?action=save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nivel: nivel,
          puntuacion: puntuacion,
          fragmentos: fragmentos,
          nombre_jugador: nombreJugador,
          firebase_uid: firebaseUid
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message);
      }
      
      console.log('Puntuación guardada:', data);
      return data;
    } catch (error) {
      console.error('Error al guardar puntuación:', error);
      throw error;
    }
  }
  
  // Obtener puntuaciones de un usuario específico
  static async getPuntuacionesUsuario(firebaseUid) {
    try {
      const response = await fetch(`${API_URL}?action=user&firebase_uid=${firebaseUid}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message);
      }
      
      return data.puntuaciones;
    } catch (error) {
      console.error('Error al obtener puntuaciones del usuario:', error);
      return [];
    }
  }
}

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PuntuacionesAPI;
}