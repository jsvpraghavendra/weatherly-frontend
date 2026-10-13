// Turns weather codes into text, icons and animation settings.

export function info(code, isDay) {
  if (code === 0) return { text: "Clear sky", icon: isDay ? "☀️" : "🌙" };
  if (code === 1) return { text: "Mainly clear", icon: isDay ? "🌤️" : "🌙" };
  if (code === 2) return { text: "Partly cloudy", icon: isDay ? "⛅" : "☁️" };
  if (code === 3) return { text: "Overcast", icon: "☁️" };
  if (code === 45 || code === 48) return { text: "Foggy", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { text: "Drizzle", icon: "🌦️" };
  if (code >= 61 && code <= 67) return { text: "Rain", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { text: "Snow", icon: "❄️" };
  if (code >= 80 && code <= 82) return { text: "Rain showers", icon: "🌦️" };
  if (code === 85 || code === 86) return { text: "Snow showers", icon: "🌨️" };
  if (code >= 95) return { text: "Thunderstorm", icon: "⛈️" };
  return { text: "Unknown", icon: "🌡️" };
}

// How heavy the rain / snow is (0 to 1)
const RAIN = { 51: 0.25, 53: 0.3, 55: 0.4, 56: 0.3, 57: 0.4, 61: 0.45, 63: 0.7, 65: 1, 66: 0.7, 67: 1, 80: 0.5, 81: 0.8, 82: 1 };
const SNOW = { 71: 0.35, 73: 0.6, 75: 1, 77: 0.4, 85: 0.5, 86: 0.9 };
// How many clouds are drifting by, and how much sun or moon shows through
const CLOUDS = { 0: 3, 1: 5, 2: 9, 3: 15 };
const OPEN_SKY = { 0: 1, 1: 0.9, 2: 0.5, 3: 0.1 };

/**
 * Returns the sky name (for the background colours) and the target values
 * the animated scene should fade towards.
 */
export function skyState(code, isDay, cloudCover = null) {
  const t = { clouds: 6, dark: 0, rain: 0, snow: 0, storm: 0, stars: 0, sun: 0, moon: 0, fog: 0, wind: 0.35 };
  let sky;

  if (code >= 95) {
    sky = "storm";
    Object.assign(t, { clouds: 18, dark: 1, rain: 1, storm: 1, wind: 1 });
  } else if (RAIN[code] !== undefined) {
    sky = isDay ? "rain" : "night";
    Object.assign(t, { clouds: 16, dark: 0.75, rain: RAIN[code], wind: 0.6 });
  } else if (SNOW[code] !== undefined) {
    sky = isDay ? "snow" : "night";
    Object.assign(t, { clouds: 14, dark: 0.15, snow: SNOW[code], wind: 0.3 });
  } else {
    const open = OPEN_SKY[code] ?? 0.3;
    const base = CLOUDS[code] ?? 8;
    t.clouds = cloudCover == null ? base : (base + 2 + (cloudCover / 100) * 14) / 2;
    if (code === 45 || code === 48) {
      t.fog = 1;
      t.clouds = 8;
    }
    if (isDay) {
      sky = code <= 1 ? "clear" : "cloudy";
      t.sun = open;
      t.dark = code === 3 ? 0.25 : 0;
    } else {
      sky = "night";
      t.moon = open;
      t.stars = open;
      t.dark = 0.7;
    }
  }
  return { sky, target: t };
}

// Used by the "Preview weather" buttons
export const PREVIEWS = {
  clear: { code: 0, isDay: 1 },
  cloudy: { code: 3, isDay: 1 },
  rain: { code: 65, isDay: 1 },
  storm: { code: 95, isDay: 1 },
  snow: { code: 73, isDay: 1 },
  night: { code: 0, isDay: 0 }
};
