let stream = null;
        const video = document.getElementById('videoElement');
        const startButton = document.getElementById('startButton');
        const stopButton = document.getElementById('stopButton');
        const statusText = document.getElementById('statusText');
        const detectionOutput = document.getElementById('detectionOutput');

        // Initialize Socket.IO for real-time communication with Flask
        const socket = io();

        async function startCamera() {
            try {
                const constraints = {
                    video: {
                        facingMode: { exact: "environment" } // Use back camera
                    }
                };

                stream = await navigator.mediaDevices.getUserMedia(constraints);
                video.srcObject = stream;
                
                startButton.disabled = true;
                stopButton.disabled = false;
                statusText.textContent = 'Camera is active';

                // Start sending frames to server
                startFrameCapture();

            } catch (err) {
                console.error('Error accessing camera:', err);
                statusText.textContent = 'Error accessing camera. Please ensure permissions are granted.';
                
                // Fallback to any available camera if back camera is not available
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    video.srcObject = stream;
                    startButton.disabled = true;
                    stopButton.disabled = false;
                    statusText.textContent = 'Camera is active (using fallback camera)';
                    startFrameCapture();
                } catch (fallbackErr) {
                    console.error('Fallback camera error:', fallbackErr);
                    statusText.textContent = 'Could not access any camera. Please check your device settings.';
                }
            }
        }

        function stopCamera() {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                video.srcObject = null;
                startButton.disabled = false;
                stopButton.disabled = true;
                statusText.textContent = 'Camera is inactive';
            }
        }

        function startFrameCapture() {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            setInterval(() => {
                if (stream && stream.active) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    // Convert frame to base64 and send to server
                    const frameData = canvas.toDataURL('image/jpeg', 0.8);
                    socket.emit('frame', frameData);
                }
            }, 1000/30); // 30 FPS
        }

        // Handle detection results from server
        socket.on('detection_result', (data) => {
            detectionOutput.textContent = data.devices.length > 0 
                ? `Detected devices: ${data.devices.join(', ')}` 
                : 'No unauthorized devices detected';
        });

        startButton.addEventListener('click', startCamera);
        stopButton.addEventListener('click', stopCamera);

        // Handle page unload
        window.addEventListener('beforeunload', stopCamera);