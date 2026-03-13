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
  workoutId: number | null;
  startTimer: (duration: number, exerciseName?: string, workoutId?: number) => void;
  stopTimer: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

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

function sendNotification(name: string | null) {
  if (Notification.permission === 'granted') {
    new Notification('Rest Timer Complete', {
      body: name
        ? `Time to start ${name}!`
        : 'Time to start your next set!',
      icon: '/icons/icon-192.png',
    });
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [exerciseName, setExerciseName] = useState<string | null>(null);
  const [workoutId, setWorkoutId] = useState<number | null>(null);

  // Absolute end-time avoids setInterval drift and fixes PWA backgrounding
  const endTimeRef = useRef(0);
  // Epoch counter forces useEffect re-run even when isRunning stays true
  const epochRef = useRef(0);
  const [epoch, setEpoch] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    endTimeRef.current = 0;
    firedRef.current = false;
    setIsRunning(false);
    setSeconds(0);
    setExerciseName(null);
    setWorkoutId(null);
  }, []);

  const startTimer = useCallback(
    (duration: number, name?: string, wId?: number) => {
      // Clear any existing interval imperatively
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      endTimeRef.current = Date.now() + duration * 1000;
      firedRef.current = false;
      epochRef.current += 1;

      setSeconds(duration);
      setExerciseName(name || null);
      setWorkoutId(wId ?? null);
      setIsRunning(true);
      setEpoch(epochRef.current);

      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    },
    []
  );

  // Main timer loop — keyed on epoch so it always restarts
  useEffect(() => {
    if (!isRunning || endTimeRef.current === 0) return;

    function tick() {
      const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);

      if (remaining <= 0) {
        setSeconds(0);
        if (!firedRef.current) {
          firedRef.current = true;
          playBeep();
          sendNotification(exerciseName);
        }
        setIsRunning(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      setSeconds(remaining);
    }

    tick();
    intervalRef.current = setInterval(tick, 250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [epoch, isRunning, exerciseName]);

  // Recalculate on visibility change (PWA resume from background)
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      if (!endTimeRef.current) return;

      const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        if (!firedRef.current) {
          firedRef.current = true;
          playBeep();
          sendNotification(exerciseName);
        }
        setSeconds(0);
        setIsRunning(false);
      } else {
        setSeconds(remaining);
      }
    }

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [exerciseName]);

  return (
    <TimerContext.Provider
      value={{ seconds, isRunning, exerciseName, workoutId, startTimer, stopTimer }}
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
