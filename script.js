document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const statusText = document.getElementById('overlay-status');
    const overlay = document.getElementById('overlay');
    const accelerationDisplay = document.getElementById('acceleration-display');
    const resultModal = document.getElementById('result-modal');
    const resultText = document.getElementById('result-text');
    const resultDetails = document.getElementById('result-details');
    const closeModal = document.getElementById('close-modal');
    requestDeviceMotionPermission();
    let stableTimer = null;
    let isStable = false;
    let processingAnimation;
    const lottieAnimation = lottie.loadAnimation({
        container: document.getElementById('lottie-animation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'assets/info.json'   
    });
    var animation = lottie.loadAnimation({
        container: document.getElementById('lottie-animation-end'), // Animasyonun yükleneceği div
        renderer: 'svg', // Render türü
        loop: true, // Sonsuz döngüde oynat
        autoplay: true, // Otomatik oynatma
        path: 'assets/error.json' // Lottie JSON dosyasının yolu
    });

    startCamera();

    setTimeout(() => {
        overlay.style.display = 'none';
        startStabilityCheck();
    }, 3000);

    function requestDeviceMotionPermission() {
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('devicemotion', checkStability, true);
                    } else {
                        console.warn('DeviceMotion permission not granted');
                    }
                })
                .catch(console.error);
        } else {
            // Eski iOS versiyonları için
            window.addEventListener('devicemotion', checkStability, true);
        }
    }
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

    function stopStabilityCheck() {
        window.removeEventListener('devicemotion', checkStability, true);
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
    
        canvas.toBlob(blob => {
            if (!blob) {
                console.error('Blob oluşturulamadı.');
                alert('Blob oluşturulamadı.');
                return;
            }
    
            const formData = new FormData();
            formData.append('image', blob, 'snapshot.png');
    
            // Show the processing overlay before sending the request
            showProcessingOverlay();
    
            fetch('https://inmapperocr.online/compare-logo', {
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
                    if (data.best_match.startsWith('Low Information Image Detected')) {
                        // Eğer "Low Information Image Detected" ile başlıyorsa sadece mesaj göster
                        resultText.innerText = `Düşük Bilgili Görüntü Tespit Edildi`;
                        document.getElementById('logo-image').style.display = 'none'; // Resmi gizle
                        showError(); // Hata durumunda error mesajı göster
                    } else {
                        // Normal eşleşme durumu
                        document.getElementById('logo-image').src = `assets/logo_dataset/${data.best_match}.png`;
                        resultText.innerText = `Şu an ${data.best_match} yakınlarındasınız`;
                        document.getElementById('logo-image').style.display = 'block'; // Resmi göster
                        hideError(); // Hata yok, error mesajını gizle
                    }
                    
                    resultModal.style.display = 'block'; 
                    stopStabilityCheck(); // Durumu kontrol etmeyi durdur
    
                    // Hide the processing overlay after processing is done
                    hideProcessingOverlay();
                })
                .catch(error => {
                    console.error('Error:', error);
                    resultText.innerText = `Eşleşme Bulunamadı`;
                    resultDetails.innerText = `Tekrar deneyebilir veya geri dönerek seçim yapabilirsiniz.`;
                    resultModal.style.display = 'block';
                    showError();
                    stopStabilityCheck(); // Hata durumunda stability check'i durdur
    
                    // Hide the processing overlay on error
                    hideProcessingOverlay();
                });
        });
    }
    
    closeModal.addEventListener('click', () => {
        resultModal.style.display = 'none';
    });

    function showError() {
        document.getElementById('logo-image').style.display = 'none';
        document.getElementById('progressContainer').style.display = 'none';
        document.getElementById('lottie-animation-end').style.display = 'block';
        animation.play();
    }

    function hideError() {
        document.getElementById('logo-image').style.display = 'block';
        document.getElementById('progressContainer').style.display = 'block';
        document.getElementById('lottie-animation-end').style.display = 'none';
    }
    function showProcessingOverlay() {
        document.getElementById('processing-overlay').style.display = 'flex';
    
        // Load and play the Lottie animation
        processingAnimation = lottie.loadAnimation({
            container: document.getElementById('lottie-processing-animation'), // the DOM element that will contain the animation
            renderer: 'svg', // 'svg', 'canvas', 'html'
            loop: true, // Loop the animation
            autoplay: true, // Start playing the animation
            path: 'assets/processing.json' // the path to the animation json
        });
    }
    
    function hideProcessingOverlay() {
        document.getElementById('processing-overlay').style.display = 'none';
    
        // Stop the animation
        if (processingAnimation) {
            processingAnimation.stop();
            processingAnimation.destroy(); // Optional: Clean up the animation instance
        }
    }
});
