"use client";

import React, { useEffect, useState } from 'react';
import { Sun, Moon, Sunrise, Sunset } from 'lucide-react';

export default function Greeting() {
  const [greeting, setGreeting] = useState('');
  const [icon, setIcon] = useState<React.ReactNode>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateGreeting = () => {
      const hour = new Date().getHours();
      
      if (hour >= 5 && hour < 12) {
        setGreeting('Good Morning, Drobo!');
        setIcon(<Sunrise className="h-4 w-4 text-orange-500" />);
      } else if (hour >= 12 && hour < 17) {
        setGreeting('Good Afternoon!');
        setIcon(<Sun className="h-4 w-4 text-yellow-500" />);
      } else {
        setGreeting('Good Evening!');
        setIcon(<Moon className="h-4 w-4 text-blue-500" />);
      }
    };

    updateGreeting();
    // Update every minute to stay accurate
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-white/90 backdrop-blur-sm py-1.5 px-3 rounded-full shadow-sm w-fit mb-3 animate-in fade-in slide-in-from-bottom-2 duration-500 border border-slate-100">
      {icon}
      <span>{greeting}</span>
    </div>
  );
}
