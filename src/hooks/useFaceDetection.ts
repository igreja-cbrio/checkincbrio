import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';

interface UseFaceDetectionOptions {
  onFaceDetected?: (descriptor: Float32Array) => void;
  autoDetect?: boolean;
  detectionInterval?: number;
}

interface UseFaceDetectionReturn {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  detectFace: () => Promise<Float32Array | null>;
  isCameraActive: boolean;
  faceDetected: boolean;
}

export function useFaceDetection(options: UseFaceDetectionOptions = {}): UseFaceDetectionReturn {
  const { onFaceDetected, autoDetect = false, detectionInterval = 500 } = options;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const modelsLoadedRef = useRef(false);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      if (modelsLoadedRef.current) {
        setIsLoading(false);
        setIsReady(true);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const MODEL_URL = '/models';
        
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        
        modelsLoadedRef.current = true;
        setIsReady(true);
        console.log('Face detection models loaded successfully');
      } catch (err) {
        console.error('Failed to load face detection models:', err);
        setError('Falha ao carregar modelos de detecção facial');
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Failed to access camera:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraActive(false);
    setFaceDetected(false);
  }, []);

  const detectFace = useCallback(async (): Promise<Float32Array | null> => {
    if (!videoRef.current || !isReady || !isCameraActive) {
      return null;
    }

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        setFaceDetected(true);
        
        // Draw detection on canvas
        if (canvasRef.current && videoRef.current) {
          const displaySize = {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight,
          };
          
          faceapi.matchDimensions(canvasRef.current, displaySize);
          const resizedDetection = faceapi.resizeResults(detection, displaySize);
          
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            faceapi.draw.drawDetections(canvasRef.current, [resizedDetection]);
            faceapi.draw.drawFaceLandmarks(canvasRef.current, [resizedDetection]);
          }
        }
        
        return detection.descriptor;
      } else {
        setFaceDetected(false);
        
        // Clear canvas
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
        
        return null;
      }
    } catch (err) {
      console.error('Face detection error:', err);
      return null;
    }
  }, [isReady, isCameraActive]);

  // Auto-detect faces
  useEffect(() => {
    if (autoDetect && isCameraActive && isReady) {
      detectionIntervalRef.current = setInterval(async () => {
        const descriptor = await detectFace();
        if (descriptor && onFaceDetected) {
          onFaceDetected(descriptor);
        }
      }, detectionInterval);
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [autoDetect, isCameraActive, isReady, detectFace, onFaceDetected, detectionInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    isLoading,
    isReady,
    error,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    detectFace,
    isCameraActive,
    faceDetected,
  };
}
