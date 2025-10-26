"use client";

import { motion } from "motion/react";
import { useState, useRef, useEffect } from "react";
import type { RecordingState, AnalyzeVoiceResponse } from "@/lib/types";

export function VoiceRecorder() {
  const [state, setState] = useState<RecordingState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeVoiceResponse | null>(null);
  const [supportsMediaRecorder, setSupportsMediaRecorder] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef<boolean>(false);

  useEffect(() => {
    setSupportsMediaRecorder(
      typeof window !== 'undefined' && 
      typeof MediaRecorder !== 'undefined'
    );
  }, []);

  const startRecording = async () => {
    try {
      setState('recording');
      isRecordingRef.current = true;
      setAudioBlob(null);
      setAudioUrl(null);
      setResult(null);
      chunksRef.current = [];

      // Request microphone permission and get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Only reset to idle if we were actually recording
        if (isRecordingRef.current) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          setState('idle');
          isRecordingRef.current = false;
        }
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setState('error');
        isRecordingRef.current = false;
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorder.start();
    } catch (error) {
      console.error('Microphone permission denied or MediaRecorder not supported:', error);
      setState('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      isRecordingRef.current = false;
      mediaRecorderRef.current.stop();
    }
  };

  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play();
    }
  };

  const sendAudioForAnalysis = async () => {
    if (!audioBlob) return;

    try {
      setState('processing');
      
      // For now, we'll use a placeholder transcript since we're focusing on audio capture
      // In a production app, you'd send the audio to a transcription service
      const transcript = "Voice message recorded - transcription service integration needed";
      
      const response = await fetch('/api/analyze-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript }),
      });

      const data: AnalyzeVoiceResponse = await response.json();
      setResult(data);
      
      if (data.success) {
        setState('success');
      } else {
        setState('error');
      }
    } catch (error) {
      console.error('API call failed:', error);
      setState('error');
    }
  };

  const reset = () => {
    setState('idle');
    isRecordingRef.current = false;
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setResult(null);
  };

  const getButtonText = () => {
    switch (state) {
      case 'recording':
        return 'Stop Recording';
      case 'processing':
        return 'Processing...';
      case 'success':
        return 'Success!';
      case 'error':
        return 'Try Again';
      default:
        return audioBlob ? 'Send Voice Message' : 'Start Recording';
    }
  };

  const isDisabled = state === 'processing';

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.6,
            ease: "easeOut",
          },
        },
      }}
      className="flex flex-col items-center space-y-6"
    >
      <motion.button
        onClick={
          state === 'success' || state === 'error' 
            ? reset 
            : state === 'recording' 
            ? stopRecording 
            : audioBlob 
            ? sendAudioForAnalysis 
            : startRecording
        }
        disabled={isDisabled}
        className={`
          relative px-6 py-3 rounded-xl font-semibold text-base
          transition-all duration-300 transform
          ${state === 'success' 
            ? 'bg-green-500 hover:bg-green-600 text-white' 
            : state === 'error'
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-cyan hover:bg-cyan/90 text-black'
          }
          ${isDisabled ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
          shadow-lg hover:shadow-xl
        `}
        whileHover={!isDisabled ? { scale: 1.05 } : {}}
        whileTap={!isDisabled ? { scale: 0.95 } : {}}
      >
        <div className="flex items-center space-x-3">
          {state === 'recording' && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="w-4 h-4 bg-white rounded-full"
            />
          )}
          <span>{getButtonText()}</span>
          {state === 'recording' && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5"
            >
              🎤
            </motion.div>
          )}
        </div>
      </motion.button>

      {audioUrl && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <p className="text-xs text-text-light mb-2">Your voice message:</p>
          <div className="bg-gray-100 p-3 rounded-lg">
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full"
              preload="metadata"
            />
            <div className="mt-2 flex justify-center">
              <button
                onClick={playAudio}
                className="text-xs text-cyan hover:text-cyan/80 transition-colors"
              >
                🔊 Play recording
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {result && result.success && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <p className="text-green-600 font-semibold text-sm">✅ Call booked successfully!</p>
          <a
            href={result.eventLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-magenta text-white px-3 py-2 rounded-lg hover:bg-magenta/90 transition-colors text-sm"
          >
            Open in Google Calendar
          </a>
        </motion.div>
      )}

      {result && !result.success && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-red-600 font-semibold text-sm">❌ {result.error || 'Something went wrong'}</p>
        </motion.div>
      )}

      {!supportsMediaRecorder && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-text-light text-xs">
            Audio recording is not supported in this browser. Please use a modern browser like Chrome, Firefox, Edge, or Safari.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
