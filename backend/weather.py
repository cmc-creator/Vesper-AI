"""
Weather tool for Vesper — no API key required (wttr.in) + OpenWeatherMap if key provided.

Actions:
  current   — current conditions for a location
  forecast  — 3-day forecast
  hourly    — today's hourly breakdown
  astronomy — sunrise/sunset/moon phase
  alerts    — active weather alerts (OWM key required)
  air       — air quality index (OWM key required)
"""

import os
import json
import aiohttp
import asyncio
from typing import Optional

_OWM_KEY = lambda: os.environ.get("OPENWEATHERMAP_API_KEY", "")


async def _wttr(location: str, params: dict) -> dict:
    """Call wttr.in JSON API — free, no key needed."""
    url = f"https://wttr.in/{location}"
    params["format"] = "j1"
    try:
        async with aiohttp.ClientSession() as s:
            async with s.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as r:
                if r.status != 200:
                    return {"error": f"wttr.in returned {r.status}"}
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": f"wttr.in request failed: {e}"}


def _fmt_temp(c_str: str) -> str:
    try:
        c = float(c_str)
        f = round(c * 9 / 5 + 32, 1)
        return f"{f}°F / {c}°C"
    except Exception:
        return c_str


def _wind_dir(deg_str: str) -> str:
    try:
        deg = int(deg_str)
        dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
        return dirs[round(deg / 22.5) % 16]
    except Exception:
        return deg_str


def _weather_code_emoji(code: str) -> str:
    code = str(code)
    mapping = {
        "113": "☀️", "116": "⛅", "119": "☁️", "122": "☁️",
        "143": "🌫️", "176": "🌦️", "179": "🌨️", "182": "🌧️",
        "185": "🌨️", "200": "⛈️", "227": "❄️", "230": "❄️",
        "248": "🌫️", "260": "🌫️", "263": "🌦️", "266": "🌦️",
        "281": "🌨️", "284": "🌨️", "293": "🌦️", "296": "🌦️",
        "299": "🌧️", "302": "🌧️", "305": "🌧️", "308": "🌧️",
        "311": "🌨️", "314": "🌨️", "317": "🌨️", "320": "❄️",
        "323": "❄️", "326": "❄️", "329": "❄️", "332": "❄️",
        "335": "❄️", "338": "❄️", "350": "🌨️", "353": "🌦️",
        "356": "🌧️", "359": "🌧️", "362": "🌨️", "365": "🌨️",
        "368": "❄️", "371": "❄️", "374": "🌨️", "377": "🌨️",
        "386": "⛈️", "389": "⛈️", "392": "⛈️", "395": "❄️",
    }
    return mapping.get(code, "🌡️")


async def weather_tool(params: dict, **kwargs) -> dict:
    action = params.get("action", "current").lower()
    location = params.get("location", "").strip()
    units = params.get("units", "imperial").lower()  # imperial or metric

    if not location:
        return {"error": "location is required"}

    loc_encoded = location.replace(" ", "+")

    if action == "current":
        data = await _wttr(loc_encoded, {})
        if "error" in data:
            return data
        try:
            cur = data["current_condition"][0]
            near = data.get("nearest_area", [{}])[0]
            area = near.get("areaName", [{}])[0].get("value", location)
            country = near.get("country", [{}])[0].get("value", "")
            desc = cur.get("weatherDesc", [{}])[0].get("value", "Unknown")
            code = cur.get("weatherCode", "113")
            emoji = _weather_code_emoji(code)
            temp_c = cur.get("temp_C", "?")
            feels_c = cur.get("FeelsLikeC", "?")
            humidity = cur.get("humidity", "?")
            wind_mph = cur.get("windspeedMiles", "?")
            wind_dir = _wind_dir(cur.get("winddirDegree", "0"))
            visibility = cur.get("visibility", "?")
            uv = cur.get("uvIndex", "?")

            if units == "metric":
                temp_str = f"{temp_c}°C"
                feels_str = f"{feels_c}°C"
                wind_str = f"{cur.get('windspeedKmph', '?')} km/h"
            else:
                temp_str = _fmt_temp(temp_c)
                feels_str = _fmt_temp(feels_c)
                wind_str = f"{wind_mph} mph"

            text = (
                f"{emoji} **{area}{', ' + country if country else ''}** — {desc}\n"
                f"🌡️ Temp: {temp_str} (feels like {feels_str})\n"
                f"💧 Humidity: {humidity}%\n"
                f"💨 Wind: {wind_str} {wind_dir}\n"
                f"👁️ Visibility: {visibility} km | UV Index: {uv}"
            )
            return {
                "location": f"{area}, {country}",
                "description": desc,
                "temp": temp_str,
                "feels_like": feels_str,
                "humidity": f"{humidity}%",
                "wind": wind_str,
                "wind_direction": wind_dir,
                "uv_index": uv,
                "preview": text,
            }
        except Exception as e:
            return {"error": f"parse error: {e}", "raw": str(data)[:500]}

    elif action == "forecast":
        days = min(int(params.get("days", 3)), 3)
        data = await _wttr(loc_encoded, {})
        if "error" in data:
            return data
        try:
            weather_days = data.get("weather", [])[:days]
            near = data.get("nearest_area", [{}])[0]
            area = near.get("areaName", [{}])[0].get("value", location)
            lines = [f"📅 **{days}-day forecast for {area}**\n"]
            for day in weather_days:
                date = day.get("date", "")
                max_c = day.get("maxtempC", "?")
                min_c = day.get("mintempC", "?")
                hourly = day.get("hourly", [])
                desc = hourly[4].get("weatherDesc", [{}])[0].get("value", "") if len(hourly) > 4 else ""
                code = hourly[4].get("weatherCode", "113") if len(hourly) > 4 else "113"
                emoji = _weather_code_emoji(code)
                rain_mm = sum(float(h.get("precipMM", 0)) for h in hourly)

                if units == "metric":
                    temp_range = f"{min_c}°C - {max_c}°C"
                else:
                    temp_range = f"{_fmt_temp(min_c).split('/')[0].strip()} - {_fmt_temp(max_c).split('/')[0].strip()}"

                lines.append(f"**{date}** {emoji} {desc}")
                lines.append(f"  🌡️ {temp_range} | 🌧️ Rain: {rain_mm:.1f}mm")
            return {"forecast": weather_days, "preview": "\n".join(lines)}
        except Exception as e:
            return {"error": f"parse error: {e}"}

    elif action == "hourly":
        data = await _wttr(loc_encoded, {})
        if "error" in data:
            return data
        try:
            today = data.get("weather", [{}])[0]
            hourly_data = today.get("hourly", [])
            near = data.get("nearest_area", [{}])[0]
            area = near.get("areaName", [{}])[0].get("value", location)
            lines = [f"⏱️ **Hourly forecast for {area} today**\n"]
            for h in hourly_data:
                time_val = h.get("time", "0")
                hour = int(time_val) // 100
                am_pm = "AM" if hour < 12 else "PM"
                hour_12 = hour if hour <= 12 else hour - 12
                if hour_12 == 0:
                    hour_12 = 12
                desc = h.get("weatherDesc", [{}])[0].get("value", "")
                code = h.get("weatherCode", "113")
                emoji = _weather_code_emoji(code)
                temp_c = h.get("tempC", "?")
                rain_chance = h.get("chanceofrain", "0")

                if units == "metric":
                    temp_str = f"{temp_c}°C"
                else:
                    temp_str = _fmt_temp(temp_c).split("/")[0].strip()

                lines.append(f"**{hour_12}:00 {am_pm}** {emoji} {desc} — {temp_str}, 🌧️{rain_chance}%")
            return {"hourly": hourly_data, "preview": "\n".join(lines)}
        except Exception as e:
            return {"error": f"parse error: {e}"}

    elif action == "astronomy":
        data = await _wttr(loc_encoded, {})
        if "error" in data:
            return data
        try:
            today = data.get("weather", [{}])[0]
            astro = today.get("astronomy", [{}])[0]
            near = data.get("nearest_area", [{}])[0]
            area = near.get("areaName", [{}])[0].get("value", location)
            sunrise = astro.get("sunrise", "?")
            sunset = astro.get("sunset", "?")
            moonrise = astro.get("moonrise", "?")
            moonset = astro.get("moonset", "?")
            moon_phase = astro.get("moon_phase", "?")
            moon_illum = astro.get("moon_illumination", "?")

            preview = (
                f"🌅 **{area}** — Astronomy\n"
                f"☀️ Sunrise: {sunrise} | Sunset: {sunset}\n"
                f"🌙 Moonrise: {moonrise} | Moonset: {moonset}\n"
                f"🌕 Moon Phase: {moon_phase} ({moon_illum}% illuminated)"
            )
            return {"sunrise": sunrise, "sunset": sunset, "moon_phase": moon_phase, "moon_illumination": moon_illum, "preview": preview}
        except Exception as e:
            return {"error": f"parse error: {e}"}

    elif action in ("alerts", "air"):
        owm_key = _OWM_KEY()
        if not owm_key:
            return {"error": f"OPENWEATHERMAP_API_KEY env var required for action='{action}'"}

        if action == "alerts":
            # geocode first
            geo_url = "http://api.openweathermap.org/geo/1.0/direct"
            try:
                async with aiohttp.ClientSession() as s:
                    async with s.get(geo_url, params={"q": location, "limit": 1, "appid": owm_key}, timeout=aiohttp.ClientTimeout(total=10)) as r:
                        geo = await r.json()
                if not geo:
                    return {"error": f"Could not geocode location: {location}"}
                lat, lon = geo[0]["lat"], geo[0]["lon"]
                async with aiohttp.ClientSession() as s:
                    async with s.get("https://api.openweathermap.org/data/3.0/onecall",
                                     params={"lat": lat, "lon": lon, "appid": owm_key, "exclude": "minutely,hourly,daily"},
                                     timeout=aiohttp.ClientTimeout(total=10)) as r:
                        ow = await r.json()
                alerts = ow.get("alerts", [])
                if not alerts:
                    return {"alerts": [], "preview": f"✅ No active weather alerts for {location}."}
                lines = [f"⚠️ **{len(alerts)} Active Alert(s) for {location}**\n"]
                for a in alerts:
                    lines.append(f"**{a.get('event', 'Alert')}** — {a.get('sender_name', '')}")
                    lines.append(f"  {a.get('description', '')[:300]}")
                return {"alerts": alerts, "preview": "\n".join(lines)}
            except Exception as e:
                return {"error": f"OWM alerts error: {e}"}

        elif action == "air":
            geo_url = "http://api.openweathermap.org/geo/1.0/direct"
            try:
                async with aiohttp.ClientSession() as s:
                    async with s.get(geo_url, params={"q": location, "limit": 1, "appid": owm_key}, timeout=aiohttp.ClientTimeout(total=10)) as r:
                        geo = await r.json()
                if not geo:
                    return {"error": f"Could not geocode location: {location}"}
                lat, lon = geo[0]["lat"], geo[0]["lon"]
                async with aiohttp.ClientSession() as s:
                    async with s.get("http://api.openweathermap.org/data/2.5/air_pollution",
                                     params={"lat": lat, "lon": lon, "appid": owm_key},
                                     timeout=aiohttp.ClientTimeout(total=10)) as r:
                        aq = await r.json()
                aqi = aq["list"][0]["main"]["aqi"]
                components = aq["list"][0]["components"]
                aqi_labels = {1: "Good 😊", 2: "Fair 🙂", 3: "Moderate 😐", 4: "Poor 😷", 5: "Very Poor ⚠️"}
                label = aqi_labels.get(aqi, str(aqi))
                preview = (
                    f"💨 **Air Quality — {location}** — {label}\n"
                    f"PM2.5: {components.get('pm2_5', '?')} µg/m³ | PM10: {components.get('pm10', '?')} µg/m³\n"
                    f"NO₂: {components.get('no2', '?')} | O₃: {components.get('o3', '?')} | CO: {components.get('co', '?')}"
                )
                return {"aqi": aqi, "aqi_label": label, "components": components, "preview": preview}
            except Exception as e:
                return {"error": f"OWM air quality error: {e}"}

    else:
        return {"error": f"Unknown action '{action}'. Use: current | forecast | hourly | astronomy | alerts | air"}
