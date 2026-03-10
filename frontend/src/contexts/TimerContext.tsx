import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

interface TimerContextType {
  seconds: number;
  isRunning: boolean;
  exerciseName: string | null;
  startTimer: (duration: number, exerciseName?: string) => void;
  stopTimer: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

// Triple beep via Web Audio API (respects device ringer/volume)
function playBeep() {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = 0.5;

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      osc.connect(gain);
      osc.frequency.value = 880;
      osc.type = 'sine';
      osc.start(ctx.currentTime + i * 0.25);
      osc.stop(ctx.currentTime + i * 0.25 + 0.15);
    }
  } catch {
    // Audio not available
  }
}

function sendNotification(exerciseName: string | null) {
  if (Notification.permission === 'granted') {
    new Notification('Rest Timer Complete', {
      body: exerciseName
        ? `Time to start ${exerciseName}!`
        : 'Time to start your next set!',
      icon: '/icons/icon-192.png',
    });
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [exerciseName, setExerciseName] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setSeconds(0);
    setExerciseName(null);
  }, []);

  const startTimer = useCallback(
    (duration: number, name?: string) => {
      stopTimer();
      setSeconds(duration);
      setExerciseName(name || null);
      setIsRunning(true);

      // Request notification permission
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    },
    [stopTimer]
  );

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          playBeep();
          sendNotification(exerciseName);
          setIsRunning(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, exerciseName]);

  return (
    <TimerContext.Provider
      value={{ seconds, isRunning, exerciseName, startTimer, stopTimer }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
