// Load face-api.js models
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./faces/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./faces/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('./faces/models'),
]).then(startFaceScanner).catch(error => {
    console.error('Error loading models:', error);
});

const knownFaces = {
    'Govinda': {
        url: 'Govinda.html',
        imageCount: 3  // number of training images for Govinda
    },
    'Arbin': {
        url: 'Arbin.html',
        imageCount: 2  // number of training images for Arbin
    },
    'Diya': {
        url: 'Diya.html',
        imageCount: 2  // number of training images for Diya
    },
    'Swopnil': {
        url: 'Swopnil.html',
        imageCount: 2  // number of training images for Swopnil
    },
    'Aagya': {
        url: 'Aagya.html',
        imageCount: 2  // number of training images for Aagya
    }
};

let labeledDescriptors = [];

// Load and process reference images
async function loadLabeledImages() {
    for (let name in knownFaces) {
        const descriptions = [];
        
        // Load multiple images for each person
        for (let i = 1; i <= knownFaces[name].imageCount; i++) {
            try {
                const img = await faceapi.fetchImage(`/faces/${name}_${i}.jpg`);
                const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();
                
                if (detection) {
                    descriptions.push(detection.descriptor);
                }
            } catch (error) {
                console.warn(`Error loading image ${name}_${i}.jpg:`, error);
            }
        }

        if (descriptions.length > 0) {
            labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(name, descriptions));
        }
    }
}

// Initialize face scanner
async function startFaceScanner() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const modal = document.getElementById('scannerModal');
    const startButton = document.getElementById('startScan');
    const closeButton = document.querySelector('.close-scanner');

    // Show loading state
    startButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading Models...';
    startButton.disabled = true;

    try {
        await loadLabeledImages();
        
        // Reset button state
        startButton.innerHTML = '<i class="fas fa-camera"></i> Start Face Scan';
        startButton.disabled = false;

        await loadLabeledImages();

        startButton.addEventListener('click', async () => {
            modal.style.display = 'flex';
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: {
                        facingMode: 'user', // Use front camera on mobile devices
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
                video.srcObject = stream;
            } catch (err) {
                console.error('Error accessing camera:', err);
                alert('Unable to access camera. Please make sure you have granted camera permissions.');
            }
        });

        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
            }
        });

        video.addEventListener('play', async () => {
            console.log('Video stream started');
            const displaySize = { width: video.width, height: video.height };
            faceapi.matchDimensions(canvas, displaySize);

            setInterval(async () => {
                try {
                    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                        .withFaceLandmarks()
                        .withFaceDescriptors();

                    console.log('Detections:', detections.length);

                    if (detections.length > 0) {
                        const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
                        const results = detections.map(d => faceMatcher.findBestMatch(d.descriptor));

                        results.forEach(result => {
                            console.log('Match result:', result.label, result.distance);
                            if (result.label !== 'unknown') {
                                const profileUrl = knownFaces[result.label].url;
                                if (profileUrl) {
                                    console.log('Navigating to:', profileUrl);
                                    window.location.href = profileUrl;
                                }
                            }
                        });
                    }
                } catch (error) {
                    console.error('Error in face detection:', error);
                }
            }, 100);
        });
    } catch (error) {
        console.error('Error initializing face scanner:', error);
        startButton.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error Loading';
        alert('Error initializing face scanner. Please refresh and try again.');
    }
} 