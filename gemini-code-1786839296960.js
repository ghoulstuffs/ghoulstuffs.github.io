// Start Music and fade out the entry screen
function startExperience() {
    const overlay = document.getElementById('play-overlay');
    const audio = document.getElementById('bg-music');
    
    // Set a soft, comfortable volume for jazz
    audio.volume = 0.4;
    audio.play();
    
    // Smoothly fade out the black overlay
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 1000);
}

// Image Slideshow Logic
const slides = document.querySelectorAll('.slide');
let currentSlide = 0;

function nextSlide() {
    // Remove 'active' class from current image
    slides[currentSlide].classList.remove('active');
    
    // Move to the next image, looping back to start if at the end
    currentSlide = (currentSlide + 1) % slides.length;
    
    // Add 'active' class to new image to trigger the CSS fade-in
    slides[currentSlide].classList.add('active');
}

// Change the image every 4.5 seconds (gives plenty of time for the 2.5s fade effect)
setInterval(nextSlide, 4500);