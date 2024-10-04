document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const statusText = document.getElementById('status');
    const overlay = document.getElementById('overlay');
    let stableTimer = null; // Sabitlik kontrolü için zamanlayıcı
    let isStable = false; // Telefonun sabit olup olmadığını izler

    // Lottie animasyonunu başlat
    const lottieAnimation = lottie.loadAnimation({
        container: document.getElementById('lottie-animation'), // Lottie animasyonunun oynatılacağı yer
        renderer: 'svg', // SVG olarak render edilir
        loop: true, // Döngü sürekli oynatılır
        autoplay: true, // Sayfa yüklenince otomatik başlatılır
        path: 'assets/scan.json' // Lottie JSON dosyasının yolu
    });

    // Kamera hemen başlasın (arka kamerayı kullan)
    startCamera();

    // 3 saniye sonra overlay kaybolacak ve sabitlik kontrolü başlayacak
    setTimeout(() => {
        overlay.style.display = 'none';
        startStabilityCheck(); // Sabitlik kontrolüne başla
    }, 3000);

    // Kamera başlat (arka kamerayı kullan)
    function startCamera() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { exact: 'environment' } // Arka kamera kullanımı
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

    // Sabitlik kontrolüne başla (overlay kaybolduktan sonra çalışır)
    function startStabilityCheck() {
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', checkStability, true);
        }
    }

    // Cihaz sabit kaldığında fotoğrafı çek
    function checkStability(event) {
        const { acceleration, rotationRate } = event;

        // Belirli bir threshold altında hızlanma ve dönme varsa cihaz sabittir
        const isDeviceStable = Math.abs(acceleration.x) < 0.1 && 
                               Math.abs(acceleration.y) < 0.1 && 
                               Math.abs(acceleration.z) < 0.1 &&
                               Math.abs(rotationRate.alpha) < 0.1 &&
                               Math.abs(rotationRate.beta) < 0.1 &&
                               Math.abs(rotationRate.gamma) < 0.1;

        if (isDeviceStable) {
            if (!isStable) {
                isStable = true;
                stableTimer = setTimeout(() => {
                    takePictureAndSend();
                    statusText.innerText = "Fotoğraf çekildi!";
                }, 2000); // 2 saniye boyunca sabitse fotoğraf çek
            }
        } else {
            isStable = false;
            clearTimeout(stableTimer); // Cihaz sabit değilse zamanlayıcıyı sıfırla
        }
    }

    function takePictureAndSend() {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
        // Fotoğrafı backende gönder
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
                alert(`En iyi eşleşen logo: ${data.best_match}, Skor: ${data.score}`);
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Bir hata oluştu: ' + error.message);
            });
        });
    }
});