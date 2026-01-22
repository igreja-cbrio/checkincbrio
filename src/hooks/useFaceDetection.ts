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
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
  detectFace: () => Promise<Float32Array | null>;
  isCameraActive: boolean;
  faceDetected: boolean;
}

// Camera start timeout in ms (important for iOS Safari)
const CAMERA_START_TIMEOUT = 8000;

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

  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      
      // Request camera with explicit constraints for iOS compatibility
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 960, min: 480 },
          facingMode: 'user',
        },
        audio: false,
      });
      
      streamRef.current = stream;
      
      if (!videoRef.current) {
        throw new Error('Video element not available');
      }

      const video = videoRef.current;
      
      // Set up video element for iOS Safari compatibility
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;

      // Create a promise that resolves when video is ready to play
      // with timeout protection for iOS Safari
      const videoReady = await Promise.race([
        new Promise<boolean>((resolve, reject) => {
          const onCanPlay = () => {
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
            resolve(true);
          };
          
          const onError = (e: Event) => {
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
            reject(new Error('Video element error'));
          };

          // iOS Safari sometimes needs loadedmetadata first
          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            // After metadata, try to play
            video.play()
              .then(() => {
                video.removeEventListener('canplay', onCanPlay);
                video.removeEventListener('error', onError);
                resolve(true);
              })
              .catch((playError) => {
                console.warn('Initial play failed, waiting for canplay:', playError);
                // Wait for canplay event instead
              });
          };

          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('canplay', onCanPlay);
          video.addEventListener('error', onError);

          // If video is already ready (rare but possible)
          if (video.readyState >= 3) {
            video.play()
              .then(() => resolve(true))
              .catch(() => {/* wait for events */});
          }
        }),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Camera start timeout')), CAMERA_START_TIMEOUT)
        ),
      ]);

      if (videoReady) {
        setIsCameraActive(true);
        console.log('Camera started successfully');
        return true;
      }
      
      return false;
    } catch (err: any) {
      console.error('Failed to access camera:', err);
      
      // Clean up stream if we got one
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Provide user-friendly error messages
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Permissão de câmera negada. Toque em "Permitir" quando solicitado.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('Nenhuma câmera encontrada neste dispositivo.');
      } else if (err.message === 'Camera start timeout') {
        setError('Tempo esgotado ao iniciar câmera. Toque em "Iniciar" novamente.');
      } else {
        setError('Não foi possível acessar a câmera. Verifique as permissões.');
      }
      
      return false;
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

    // Ensure video is ready
    if (videoRef.current.readyState < 2) {
      return null;
    }

    try {
      // Use higher min confidence for better accuracy
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
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
