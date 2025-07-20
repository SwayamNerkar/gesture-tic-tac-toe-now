import { useEffect, useRef, useState, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export interface HandGesture {
  pointing: boolean;
  pointingPosition: { x: number; y: number } | null;
  gesture: 'pointing' | 'open' | 'closed' | null;
}

export const useHandGestures = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gesture, setGesture] = useState<HandGesture>({
    pointing: false,
    pointingPosition: null,
    gesture: null,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectPointing = useCallback((landmarks: any) => {
    if (!landmarks || landmarks.length === 0) {
      return { pointing: false, pointingPosition: null, gesture: null };
    }

    // Get key landmarks for gesture detection
    const indexTip = landmarks[8];    // Index finger tip
    const indexPip = landmarks[6];    // Index finger PIP joint
    const middleTip = landmarks[12];  // Middle finger tip
    const middlePip = landmarks[10];  // Middle finger PIP joint
    const ringTip = landmarks[16];    // Ring finger tip
    const ringPip = landmarks[14];    // Ring finger PIP joint
    const pinkyTip = landmarks[20];   // Pinky tip
    const pinkyPip = landmarks[18];   // Pinky PIP joint
    const thumbTip = landmarks[4];    // Thumb tip
    const thumbIp = landmarks[3];     // Thumb IP joint

    // Check if index finger is extended (pointing)
    const indexExtended = indexTip.y < indexPip.y;
    
    // Check if other fingers are folded
    const middleFolded = middleTip.y > middlePip.y;
    const ringFolded = ringTip.y > ringPip.y;
    const pinkyFolded = pinkyTip.y > pinkyPip.y;
    const thumbFolded = thumbTip.x > thumbIp.x; // Thumb folding logic

    const isPointing = indexExtended && middleFolded && ringFolded && pinkyFolded;

    let gesture: 'pointing' | 'open' | 'closed' | null = null;
    
    if (isPointing) {
      gesture = 'pointing';
    } else if (indexExtended && middleTip.y < middlePip.y && ringTip.y < ringPip.y && pinkyTip.y < pinkyPip.y) {
      gesture = 'open';
    } else {
      gesture = 'closed';
    }

    return {
      pointing: isPointing,
      pointingPosition: isPointing ? { x: indexTip.x, y: indexTip.y } : null,
      gesture,
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results: Results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const gestureResult = detectPointing(landmarks);
        setGesture(gestureResult);

        // Draw landmarks for debugging
        ctx.fillStyle = '#FF0000';
        landmarks.forEach((landmark: any) => {
          ctx.beginPath();
          ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 3, 0, 2 * Math.PI);
          ctx.fill();
        });

        // Highlight index finger tip if pointing
        if (gestureResult.pointing && landmarks[8]) {
          ctx.fillStyle = '#00FF00';
          ctx.beginPath();
          ctx.arc(
            landmarks[8].x * canvas.width,
            landmarks[8].y * canvas.height,
            8,
            0,
            2 * Math.PI
          );
          ctx.fill();
        }
      } else {
        setGesture({ pointing: false, pointingPosition: null, gesture: null });
      }
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await hands.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480,
    });

    camera
      .start()
      .then(() => {
        setIsInitialized(true);
        setError(null);
      })
      .catch((err) => {
        setError('Failed to initialize camera: ' + err.message);
      });

    return () => {
      camera.stop();
    };
  }, [detectPointing]);

  return {
    videoRef,
    canvasRef,
    gesture,
    isInitialized,
    error,
  };
};