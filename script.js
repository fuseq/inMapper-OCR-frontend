document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const statusText = document.getElementById('status');
    const captureButton = document.getElementById('capture-button'); // Get the button element

    // Kamera başlat
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                video.srcObject = stream;
                video.play();
            });
    }

    // Butona tıklandığında fotoğraf çek
    captureButton.addEventListener('click', () => {
        takePictureAndSend();
        statusText.innerText = "Fotoğraf çekildi!";
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