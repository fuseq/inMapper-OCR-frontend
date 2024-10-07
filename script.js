document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const statusText = document.getElementById('overlay-status');
    const overlay = document.getElementById('overlay');
    const accelerationDisplay = document.getElementById('acceleration-display');
    const progressContainer = document.getElementById('progress-container');
    const resultModal = document.getElementById('result-modal');
    const resultText = document.getElementById('result-text');
    const closeModal = document.getElementById('close-modal');
    
    let stableTimer = null;
    let isStable = false;

    const lottieAnimation = lottie.loadAnimation({
        container: document.getElementById('lottie-animation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'assets/scan.json'
    });

    startCamera();

    setTimeout(() => {
        overlay.style.display = 'none';
        startStabilityCheck();
    }, 3000);

    function startCamera() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { exact: 'environment' }
                }
            })
            .then(stream => {
                video.srcObject = stream;
                video.play();
            })
            .catch(error => {
                console.error('Kamera açılırken bir hata oluştu:', error);
                alert('Arka kameraya erişilemiyor. Lütfen tarayıcı ayarlarını kontrol edin.');
            });
        }
    }

    function startStabilityCheck() {
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', checkStability, true);
        }
    }

    function checkStability(event) {
        const { acceleration } = event;
        accelerationDisplay.innerText = `X: ${acceleration.x.toFixed(2)}, Y: ${acceleration.y.toFixed(2)}, Z: ${acceleration.z.toFixed(2)}`;
        const isDeviceStable = Math.abs(acceleration.x) < 0.8 && Math.abs(acceleration.y) < 0.8 && Math.abs(acceleration.z) < 0.8;

        if (isDeviceStable) {
            if (!isStable) {
                isStable = true;
                stableTimer = setTimeout(() => {
                    takePictureAndSend();
                    statusText.innerText = "Fotoğraf çekildi!";
                }, 2000);
            }
        } else {
            isStable = false;
            clearTimeout(stableTimer);
        }
    }

    function takePictureAndSend() {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        progressContainer.style.display = 'block'; // Show progress bar

        canvas.toBlob(blob => {
            if (!blob) {
                console.error('Blob oluşturulamadı.');
                alert('Blob oluşturulamadı.');
                return;
            }

            const formData = new FormData();
            formData.append('image', blob, 'snapshot.png');

            fetch('http://192.168.1.107:5000/compare-logo', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP hatası: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                progressContainer.style.display = 'none'; // Hide progress bar
                resultText.innerText = `En iyi eşleşen logo: ${data.best_match}, Skor: ${data.score}`;
                resultModal.style.display = 'block'; // Show modal with results
            })
            .catch(error => {
                console.error('Error:', error);
                progressContainer.style.display = 'none'; // Hide progress bar
                resultText.innerText = 'Bir hata oluştu: ' + error.message; // Display error message
            });
        });
    }

    closeModal.addEventListener('click', () => {
        resultModal.style.display = 'none'; // Hide modal
    });
});