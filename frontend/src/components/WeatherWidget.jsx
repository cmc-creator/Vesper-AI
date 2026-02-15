import React, { useState, useEffect } from 'react';
import { Paper, Box, Typography, Skeleton } from '@mui/material';
import { WbSunny, Cloud, AcUnit, Thunderstorm, Grain } from '@mui/icons-material';

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Default to New York if geolocation fails
    const fetchWeather = async (lat, lon, city) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`);
        if (!res.ok) throw new Error('Weather API error');
        const data = await res.json();
        setWeather({ ...data.current_weather, city });
      } catch (err) {
        console.error("Weather fetch error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude, "Local Weather");
        },
        () => {
          fetchWeather(33.4484, -112.0740, "Phoenix (Default)"); // Fallback (Phoenix)
        }
      );
    } else {
      fetchWeather(33.4484, -112.0740, "Phoenix (Default)");
    }
  }, []);

  const getWeatherIcon = (code) => {
    if (code <= 1) return <WbSunny sx={{ color: '#ffd700', fontSize: 32 }} />;
    if (code <= 3) return <Cloud sx={{ color: '#90a4ae', fontSize: 32 }} />;
    if (code <= 67) return <Grain sx={{ color: '#4fc3f7', fontSize: 32 }} />; // Rain
    if (code <= 77) return <AcUnit sx={{ color: '#ffffff', fontSize: 32 }} />; // Snow
    return <Thunderstorm sx={{ color: '#7c4dff', fontSize: 32 }} />;
  };

  if (loading) return (
    <Paper className="glass-card" sx={{ p: 2, mb: 2, borderRadius: 2, background: 'rgba(10, 14, 30, 0.6)' }}>
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="rectangular" height={60} sx={{ mt: 1 }} />
    </Paper>
  );

  return (
    <Paper 
      className="glass-card"
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'rgba(10, 14, 30, 0.6)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        mb: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}
    >
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 }}>
          {weather?.city}
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--accent)', fontWeight: 700 }}>LIVE</Typography>
      </Box>

      {error ? (
        <Typography variant="body2" color="error">Weather Unavailable</Typography>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getWeatherIcon(weather?.weathercode)}
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1 }}>
              {Math.round(weather?.temperature)}°
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Fahrenheit</Typography>
          </Box>
        </Box>
      )}
      
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Box>
          <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.4)' }}>Wind</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{weather?.windspeed} mph</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.4)' }}>Condition</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>code: {weather?.weathercode}</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default WeatherWidget;
