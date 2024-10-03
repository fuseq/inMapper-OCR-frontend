document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const statusText = document.getElementById('status');
    const errorMessage = document.getElementById('error-message'); // Get the error message element
    const captureButton = document.getElementById('capture-button');

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
        errorMessage.innerText = ""; // Clear previous error message
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
            .then(response => {
                if (!response.ok) {
                    throw new Error('Sunucudan yanıt alınamadı.'); // Throw error if response is not ok
                }
                return response.json();
            })
            .then(data => {
                alert(`En iyi eşleşen logo: ${data.best_match}, Skor: ${data.score}`);
            })
            .catch(error => {
                console.error('Error:', error);
                errorMessage.innerText = 'Bir hata oluştu: ' + error.message; // Display error message below status
            });
        });
    }
});