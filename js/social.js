document.addEventListener('DOMContentLoaded', () => {
    const shareButton = document.getElementById('share-score-button');
    const socialStatus = document.getElementById('social-status');
    const socialFeedElement = document.getElementById('social-feed');

    // Obtener la mejor puntuación actual
    function getTopScore() {
        const scoreElement = document.querySelector('.scores-list li:first-child .score-value');
        const nameElement = document.querySelector('.scores-list li:first-child .score-name');
        
        return {
            score: scoreElement ? scoreElement.getAttribute('data-score') : '0',
            name: nameElement ? nameElement.textContent : 'Jugador'
        };
    }

    // Simulación de POST a la API
    function postToSocialMedia(score, name) {
        socialStatus.textContent = 'Conectando...';
        
        return new Promise(resolve => {
            setTimeout(() => {
                const success = true;
                if (success) {
                    resolve({ 
                        status: 'success', 
                        message: `Puntuación de ${score} lista para compartir.` 
                    });
                } else {
                    resolve({ 
                        status: 'error', 
                        message: 'Error en la conexión con la API de publicación.' 
                    });
                }
            }, 500);
        });
    }

    // Abrir ventana de compartir en X/Twitter
    function openTwitterShare(score, name) {
        const text = `¡Mi nueva mejor puntuación en Chrono-Dash es de ${score} puntos! Vencido por ${name}. ¿Puedes superarme? #ChronoDash #InfinityRun #WebGL`;
        const url = encodeURIComponent(window.location.href);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`;
        
        // Abrir ventana de compartir
        window.open(twitterUrl, 'ShareScore', 'width=550,height=420');
        socialStatus.textContent += ' Se abrió la ventana de compartir.';
    }

    // Cargar posts desde la API PHP
    async function fetchRealPosts() {
        try {
            const response = await fetch('api/game-feed.php');
            
            if (!response.ok) {
                throw new Error(`Error de red: ${response.status}`);
            }

            const posts = await response.json(); 
            
            socialFeedElement.innerHTML = '';

            if (posts && posts.length > 0 && !posts.error) {
                posts.forEach(post => {
                    const postItem = document.createElement('div');
                    postItem.className = 'post-item';
                    postItem.innerHTML = `
                        <p class="post-user">@${post.user}</p>
                        <p class="post-content">${post.content}</p>
                    `;
                    socialFeedElement.appendChild(postItem);
                });
            } else {
                socialFeedElement.innerHTML = '<p class="social-text" style="color: #fff; font-size: 1rem;">No hay publicaciones disponibles o el servidor devolvió un error.</p>';
            }

        } catch (error) {
            console.error("Error al cargar el feed social:", error);
            socialFeedElement.innerHTML = '<p class="social-text" style="color: red; font-size: 1rem;">❌ No se pudo conectar al servidor de feeds sociales</p>';
        }
    }
    
    // Llamar a la función al cargar la página
    fetchRealPosts();

    // Manejar click en botón de compartir
    if (shareButton) {
        shareButton.addEventListener('click', async () => {
            const topScore = getTopScore();
            
            // 1. Ejecuta la simulación de conexión a la API
            const result = await postToSocialMedia(topScore.score, topScore.name);
            
            if (result.status === 'success') {
                socialStatus.style.color = '#00e0b3';
                socialStatus.textContent = result.message;
                // 2. Abre la ventana real de X/Twitter
                openTwitterShare(topScore.score, topScore.name);
            } else {
                socialStatus.style.color = 'red';
                socialStatus.textContent = result.message;
            }
        });
    }
});