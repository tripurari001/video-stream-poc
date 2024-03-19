import React, { useEffect, useRef, useState } from 'react';
import './App.css';

const watermarkText = 'Tripurari';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const [recordingLength, setRecordingLength] = useState<number>(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const constraints: MediaStreamConstraints = { video: { width: 640, height: 480 }, audio: false };

    let mediaStreamPromise: Promise<MediaStream>;
    if (isScreenSharing) {
      mediaStreamPromise = navigator.mediaDevices.getDisplayMedia(constraints);
    } else {
      mediaStreamPromise = navigator.mediaDevices.getUserMedia(constraints);
    }

    navigator.mediaDevices.getUserMedia({
      audio: true, video: false
    }).then(audioStream => {
      audioStreamRef.current = audioStream;
    }).catch(error => {
      setError(error);
    })

    mediaStreamPromise.then(stream => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }).catch(error => {
      setError(error);
    });

    return () => {
      if (videoRef.current) {
        //@ts-ignore
        const tracks = videoRef.current.srcObject?.getTracks() ?? [];
        tracks.forEach((track: any) => track.stop());
      }
    };
  }, [isScreenSharing]);

  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;
    if (isRecording && !isPaused) {
      timerId = setInterval(() => {
        setRecordingLength(prevLength => (prevLength += 1000));
      }, 1000);
    } else if (isPaused) {
      clearInterval(timerId);
    } else {
      clearInterval(timerId);
      setRecordingLength(0);
    }
    return () => clearInterval(timerId);
  }, [isRecording, isPaused]);

  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }
      const drawFrame = () => {
        context?.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.fillStyle = 'white';
        context.font = '20px Arial';
        context?.fillText(watermarkText, 10, canvas.height - 10);
        requestAnimationFrame(drawFrame);
      };
      drawFrame();
    }
  }, []);

  useEffect(() => {
    if (!isRecording && recordedChunks.length) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style.display = 'none';
      a.href = url;
      a.download = 'camera_feed.webm';
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setRecordedChunks([]);
    }
  }, [isRecording, recordedChunks]);

  const startRecording = () => {
    if (videoRef.current && canvasRef.current) {
      const stream = canvasRef.current.captureStream();
      if (audioStreamRef.current) {
        stream.addTrack(audioStreamRef.current.getTracks()[0]);
      }
      const options: MediaRecorderOptions = { mimeType: 'video/webm;' };
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          setRecordedChunks(prevChunks => [...prevChunks, event.data]);
        }
      };

      recorder.start();
      setIsRecording(true);
      setMediaRecorder(recorder);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const togglePause = () => {
    setIsPaused(prevState => {
      const isPaused = !prevState;
      if (mediaRecorder) {
        if (isPaused) {
          mediaRecorder.pause();
        } else {
          mediaRecorder.resume();
        }
      }
      return isPaused;
    });
  };

  const toggleScreenSharing = () => {
    setIsScreenSharing(prevState => !prevState);
  };

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {error ? (
        <div>
          {`${error}`}
        </div>
      ) : (
        <div className="relative w-[640px] h-[480px]">
          <video ref={videoRef} autoPlay className="max-w-full max-h-full hidden" />
          <canvas ref={canvasRef} width={640} height={480} className="absolute top-0 left-0" />
          <div className="absolute bottom-0 right-0 p-4 flex gap-4">
            <div className="mb-2">
              {isRecording && (
                <span className="text-red-500">Recording: {formatTime(recordingLength)}</span>
              )}
            </div>
            {!isRecording ? (
              <>
                <button onClick={startRecording} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                  Start Recording
                </button>
                <button onClick={toggleScreenSharing} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                  {isScreenSharing ? 'Switch to Cam' : 'Switch to Screen'}
                </button>
              </>
            ) : (
              <>
                <button onClick={toggleScreenSharing} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                  {isScreenSharing ? 'Switch to Cam' : 'Switch to Screen'}
                </button>
                <button onClick={stopRecording} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                  Stop Recording
                </button>
                <button onClick={togglePause} className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
