export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Brooklyn, NY zip code 11238 coordinates
    const latitude = 40.6782;
    const longitude = -73.9442;
    
    // Open-Meteo API - no API key required
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Open-Meteo API error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to fetch weather data' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Map weather code to condition string
    const weatherCode = data.current?.weather_code || 0;
    const getWeatherCondition = (code: number): string => {
      // Open-Meteo weather code mapping (simplified)
      if (code === 0) return 'Clear';
      if (code <= 3) return 'Cloudy';
      if (code <= 49) return 'Foggy';
      if (code <= 59) return 'Drizzle';
      if (code <= 69) return 'Rain';
      if (code <= 79) return 'Snow';
      if (code <= 84) return 'Rain';
      if (code <= 86) return 'Snow';
      if (code <= 99) return 'Thunderstorm';
      return 'Unknown';
    };

    // Extract relevant weather information
    const weatherData = {
      temp: Math.round(data.current?.temperature_2m || 0),
      condition: getWeatherCondition(weatherCode),
    };

    return NextResponse.json(weatherData);
  } catch (error) {
    console.error('Weather API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

