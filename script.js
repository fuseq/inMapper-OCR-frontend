document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const statusText = document.getElementById('status');

    let isStable = false;
    let stableStartTime = null;
    const stableThreshold = 1000;  // 1 saniye boyunca sabit olma süresi

    // Kamera başlat
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                video.srcObject = stream;
                video.play();
            });
    }

    // Telefonun sabit olup olmadığını kontrol et
    window.addEventListener('devicemotion', (event) => {
        const acceleration = event.accelerationIncludingGravity;

        // Eğer hareket yoksa sabitlik durumu kontrol edilir
        if (Math.abs(acceleration.x) < 0.2 && Math.abs(acceleration.y) < 0.2 && Math.abs(acceleration.z) < 0.2) {
            if (!isStable) {
                // Sabitlik başladı
                isStable = true;
                stableStartTime = Date.now();
            } else if (Date.now() - stableStartTime >= stableThreshold) {
                // Sabitlik süresi yeterliyse fotoğraf çek
                takePictureAndSend();
                statusText.innerText = "Fotoğraf çekildi!";
            }
        } else {
            // Hareket varsa sabitlik durumu sıfırlanır
            isStable = false;
            stableStartTime = null;
            statusText.innerText = "Kamerayı sabit tutun...";
        }
    });

    function takePictureAndSend() {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Fotoğrafı backende gönder
        canvas.toBlob(blob => {
            const formData = new FormData();
            formData.append('image', blob, 'snapshot.png');

            fetch('http://192.168.1.107:5000/compare-logo', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                alert(`En iyi eşleşen logo: ${data.best_match}, Skor: ${data.score}`);
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Bir hata oluştu.');
            });
        });
    }
});