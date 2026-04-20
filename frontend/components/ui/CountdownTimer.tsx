"use client";
import { useState, useEffect, useCallback } from "react";

interface CountdownTimerProps {
  /** Target date as ISO string or Date */
  targetDate?: string | Date;
  /** Or specify hours from now */
  hoursFromNow?: number;
  /** Visual variant: 'dark' = white text (for dark bg), 'light' = dark text (for light bg) */
  variant?: 'dark' | 'light';
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

export default function CountdownTimer({ targetDate, hoursFromNow = 12, variant = 'dark' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ hours: 0, minutes: 0, seconds: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    let targetTime: number;
    if (targetDate) {
      targetTime = new Date(targetDate).getTime();
    } else {
      // Set target based on client time to avoid hydration mismatch
      const now = new Date();
      targetTime = now.getTime() + hoursFromNow * 60 * 60 * 1000;
    }

    const calculate = () => {
      const diff = Math.max(0, targetTime - Date.now());
      return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculate()); // Initial set

    const timer = setInterval(() => {
      setTimeLeft(calculate());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, hoursFromNow]);

  if (!isMounted) {
    // Return a stable initial render (e.g., zeroes) to match server if needed, 
    // or nothing if layout shift is acceptable. 
    // Matching the structure but with placeholders is best for CLS.
    return (
      <div className="flex items-center gap-1 opacity-0">
        <TimeBlock value="00" label="Hrs" variant={variant} />
        <span className={`font-bold text-lg ${variant === 'light' ? 'text-slate-800' : 'text-white'}`}>:</span>
        <TimeBlock value="00" label="Min" variant={variant} />
        <span className={`font-bold text-lg ${variant === 'light' ? 'text-slate-800' : 'text-white'}`}>:</span>
        <TimeBlock value="00" label="Sec" variant={variant} />
      </div>
    );
  }

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1">
      <TimeBlock value={pad(timeLeft.hours)} label="Hrs" variant={variant} />
      <span className={`font-bold text-lg animate-pulse ${variant === 'light' ? 'text-slate-800' : 'text-white'}`}>:</span>
      <TimeBlock value={pad(timeLeft.minutes)} label="Min" variant={variant} />
      <span className={`font-bold text-lg animate-pulse ${variant === 'light' ? 'text-slate-800' : 'text-white'}`}>:</span>
      <TimeBlock value={pad(timeLeft.seconds)} label="Sec" variant={variant} />
    </div>
  );
}

function TimeBlock({ value, label, variant = 'dark' }: { value: string; label: string; variant?: 'dark' | 'light' }) {
  const isDark = variant === 'dark';
  return (
    <div className="flex flex-col items-center">
      <span className={`font-bold text-lg sm:text-xl px-2.5 py-1 rounded-lg min-w-[44px] text-center tabular-nums ${
        isDark 
          ? 'bg-white/20 backdrop-blur-sm text-white' 
          : 'bg-slate-900 text-white'
      }`}>
        {value}
      </span>
      <span className={`text-[10px] mt-1 uppercase tracking-wider font-medium ${
        isDark ? 'text-white/70' : 'text-slate-500'
      }`}>{label}</span>
    </div>
  );
}

