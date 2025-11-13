document.addEventListener('DOMContentLoaded', () => {
    const pauseButton = document.getElementById('pause-button');
    const resumeButton = document.getElementById('resume-button');
    const pauseMenu = document.getElementById('pause-menu');

    // Muestra el menú de pausa cuando se hace clic en el botón de pausa
    pauseButton.addEventListener('click', () => {
        pauseMenu.style.display = 'flex';
    });

    // Oculta el menú de pausa cuando se hace clic en el botón de reanudar
    resumeButton.addEventListener('click', () => {
        pauseMenu.style.display = 'none';
        // Aquí podrías agregar la lógica para reanudar el juego si lo deseas
    });
});