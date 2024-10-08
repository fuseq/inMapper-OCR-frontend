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

    let stableTimer = null;
    let isStable = false;

    const lottieAnimation = lottie.loadAnimation({
        container: document.getElementById('lottie-animation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'assets/scan.json'
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
                    document.getElementById('logo-image').src = `assets/logo_dataset/${data.best_match}.png`;
                    resultText.innerText = `Şu an ${data.best_match} yakınlarındasınız`; 
                    resultModal.style.display = 'block'; 
                    hideError(); 
                    stopStabilityCheck(); // Başarı durumunda stability check'i durdur
                })
                .catch(error => {
                    console.error('Error:', error);
                    resultText.innerText = `Eşleşme Bulunamadı`;
                    resultDetails.innerText = `Tekrar deneyebilir veya geri dönerek seçim yapabilirsiniz.`;
                    resultModal.style.display = 'block';
                    showError();
                    stopStabilityCheck(); // Hata durumunda stability check'i durdur
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
});
