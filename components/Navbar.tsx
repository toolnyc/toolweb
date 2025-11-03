"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function Navbar() {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setCurrentTime(timeString);
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setWeatherLoading(true);
        setWeatherError(false);
        const response = await fetch("/api/weather");
        
        if (!response.ok) {
          throw new Error("Failed to fetch weather");
        }
        
        const data = await response.json();
        setWeather({
          temp: Math.round(data.temp),
          condition: data.condition,
        });
      } catch (error) {
        console.error("Error fetching weather:", error);
        setWeatherError(true);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
    // Refresh weather every 10 minutes
    const intervalId = setInterval(fetchWeather, 10 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <nav className="w-full border-b-1 border-black py-6 fixed top-0 left-0 right-0 z-50 bg-[var(--color-yellow)]">
      <div className="flex items-center justify-between max-w-7xl mx-auto px-6  lg:px-8">
        {/* Left side - Empty on desktop, can be used for mobile menu if needed */}
        <div className="flex items-center flex-1"></div>
        
        {/* Center - Logo */}
        <div className="flex justify-center items-center flex-1">
          <Image
            src="/logo.svg"
            alt="Tool Logo"
            width={120}
            height={40}
            className="h-6 w-auto sm:h-8"
            priority
          />
        </div>

        {/* Right side - Date, Location, Weather */}
        <div className="flex justify-end items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-1">
          <span className="text-text-light whitespace-nowrap">{currentTime}</span>
          <Image src="/nyp-edit.png" alt="New York City" width={80} height={16} className="text-text-light hidden sm:inline" />
          <span className="text-text-light hidden sm:inline">
            {weatherLoading
              ? "Loading..."
              : weatherError
              ? ""
              : weather
              ? `${weather.temp}°F`
              : ""}
          </span>
          {/* Mobile: Show only weather icon/short version */}
          <span className="text-text-light sm:hidden">
            {weatherLoading
              ? ""
              : weatherError
              ? ""
              : weather
              ? `${weather.temp}°`
              : ""}
          </span>
        </div>
      </div>
    </nav>
  );
}

