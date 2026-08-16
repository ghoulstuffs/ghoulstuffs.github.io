document.addEventListener('DOMContentLoaded', () => {
    const startScreen = document.getElementById('start-screen');
    const bgMusic = document.getElementById('bg-music');

    startScreen.addEventListener('click', () => {
        // Fade out the start screen
        startScreen.style.opacity = '0';
        
        // Remove it from the layout after fading
        setTimeout(() => {
            startScreen.style.display = 'none';
        }, 1500);
        
        // Start playing the music
        bgMusic.volume = 0.5; // Keeps the piano/jazz soft and chill
        bgMusic.play().catch(error => {
            console.log("Audio autoplay was prevented by the browser.");
        });
    });
});