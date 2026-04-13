"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useRouter, usePathname } from "next/navigation";

export default function SessionTimer() {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isLoggingOut = useRef(false);

  const SESSION_DURATION = 3 * 60; // 3 minutes in seconds

  const handleLogout = async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;
    
    await supabase.auth.signOut();
    sessionStorage.removeItem("session_start_time");
    setIsLoggedIn(false);
    setTimeLeft(null);
    isLoggingOut.current = false;
    router.push("/");
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsLoggedIn(true);
        let startTimeStr = sessionStorage.getItem("session_start_time");
        let startTime: number;

        if (!startTimeStr) {
          startTime = Date.now();
          sessionStorage.setItem("session_start_time", startTime.toString());
        } else {
          startTime = parseInt(startTimeStr);
        }

        const updateTimer = () => {
          const currentTime = Date.now();
          const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
          const remaining = SESSION_DURATION - elapsedSeconds;

          if (remaining <= 0) {
            handleLogout();
          } else {
            setTimeLeft(remaining);
          }
        };

        updateTimer();
        interval = setInterval(updateTimer, 1000);
      } else {
        setIsLoggedIn(false);
        setTimeLeft(null);
        sessionStorage.removeItem("session_start_time");
      }
    };

    if (pathname !== "/") {
        checkSession();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        setIsLoggedIn(true);
        const startTime = Date.now();
        sessionStorage.setItem("session_start_time", startTime.toString());
        setTimeLeft(SESSION_DURATION);
      } else if (event === "SIGNED_OUT") {
        setIsLoggedIn(false);
        setTimeLeft(null);
        sessionStorage.removeItem("session_start_time");
      }
    });

    return () => {
        if (interval) clearInterval(interval);
        subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (!isLoggedIn || timeLeft === null || pathname === "/") {
    return null;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="bg-white/90 backdrop-blur-md border border-blue-100 shadow-2xl rounded-2xl px-6 py-3 flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Session expires in</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black tabular-nums tracking-tighter ${timeLeft < 30 ? "text-red-600 animate-pulse" : "text-gray-900"}`}>
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">min</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-blue-50 flex items-center justify-center relative">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
