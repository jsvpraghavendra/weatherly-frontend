// Builds the weather page from the data the backend sends.
import { info } from "./weather.js";

const $ = (selector) => document.querySelector(selector);
const round = Math.round;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- Units ---------- */
export function units(unit) {
  const metric = unit === "c";
  return {
    t: (c) => (metric ? round(c) : round((c * 9) / 5 + 32)),
    wind: (kmh) => (metric ? round(kmh) : round(kmh * 0.621371)),
    windUnit: metric ? "km/h" : "mph"
  };
}

/* ---------- Time helpers (the API gives local time of the city) ---------- */
function parse(iso) {
  const [date, time = "00:00"] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return { y, m, d, h, mi };
}
const minutes = (iso) => {
  const p = parse(iso);
  return p.h * 60 + p.mi;
};
function clock(iso) {
  const { h, mi } = parse(iso);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(mi).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function dateLine(iso) {
  const p = parse(iso);
  const day = new Date(p.y, p.m - 1, p.d).toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" });
  return `${day}, ${clock(iso)}`;
}
function hourLabel(iso, first) {
  if (first) return "Now";
  const h = parse(iso).h;
  return `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? "PM" : "AM"}`;
}
function dayLabel(iso, index) {
  if (index === 0) return "Today";
  const p = parse(iso);
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString("en", { weekday: "short" });
}

/* ---------- Animated numbers and sun ---------- */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let shownTemp = 0;

function animateTemp(target) {
  const el = $("#temp-number");
  if (!el) return;
  if (reduceMotion) {
    el.textContent = target;
    shownTemp = target;
    return;
  }
  const from = shownTemp;
  const began = performance.now();
  function frame(now) {
    const t = Math.min((now - began) / 1200, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = round(from + (target - from) * eased);
    if (t < 1) requestAnimationFrame(frame);
    else shownTemp = target;
  }
  requestAnimationFrame(frame);
}

function animateSun(progress, isDaytime) {
  const dot = $("#sun-dot");
  const halo = $("#sun-halo");
  const lit = $("#arc-lit");
  if (!dot) return;
  const place = (p) => {
    const x = 150 - 130 * Math.cos(p * Math.PI);
    const y = 120 - 110 * Math.sin(p * Math.PI);
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    halo.setAttribute("cx", x);
    halo.setAttribute("cy", y);
    lit.setAttribute("stroke-dasharray", `${p} 1`);
  };
  if (reduceMotion) return place(progress);
  const began = performance.now();
  function frame(now) {
    const t = Math.min((now - began) / 1800, 1);
    place(progress * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(frame);
  }
  place(0);
  requestAnimationFrame(frame);
}

/* ---------- Sections ---------- */
function smoothPath(points) {
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

function heroHTML(data, u) {
  const { current, daily } = data;
  const now = info(current.weather_code, current.is_day);
  const place = [data.region, data.country].filter(Boolean).join(", ");
  return `
    <div class="hero-main">
      <p class="when reveal" style="--i:0">${dateLine(current.time)}</p>
      <h2 class="place reveal" style="--i:1">${esc(data.city)}</h2>
      <p class="region reveal" style="--i:1">${esc(place)}</p>
      <div class="temp reveal" style="--i:2"><span id="temp-number">${shownTemp}</span><sup>°</sup></div>
      <div class="cond reveal" style="--i:3"><span class="icon">${now.icon}</span><span>${now.text}</span></div>
      <p class="range reveal" style="--i:4">
        High ${u.t(daily.temperature_2m_max[0])}° &nbsp; Low ${u.t(daily.temperature_2m_min[0])}° &nbsp; Feels like ${u.t(current.apparent_temperature)}°
      </p>
    </div>`;
}

function sunCardHTML(data, u) {
  const { current, daily } = data;
  const rise = minutes(daily.sunrise[0]);
  const set = minutes(daily.sunset[0]);
  const nowMin = minutes(current.time);
  const dir = DIRECTIONS[round(current.wind_direction_10m / 45) % 8];
  const arc = "M20 120 A130 110 0 0 1 280 120";
  const details = [
    ["Humidity", `${current.relative_humidity_2m}%`],
    ["Wind", `${u.wind(current.wind_speed_10m)} ${u.windUnit} ${dir}`],
    ["Pressure", `${round(current.surface_pressure)} hPa`],
    ["Cloud cover", `${current.cloud_cover}%`],
    ["Rain chance", `${daily.precipitation_probability_max[0] ?? 0}%`],
    ["UV index", `${round(daily.uv_index_max[0] ?? 0)}`]
  ];
  return `
    <aside class="glass sun-card reveal" style="--i:3">
      <svg class="sunarc" viewBox="0 0 300 130" role="img" aria-label="Sun position today">
        <defs>
          <linearGradient id="arcGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stop-color="#ffd37a"/><stop offset="1" stop-color="#ffffff"/>
          </linearGradient>
        </defs>
        <line x1="8" y1="120" x2="292" y2="120" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
        <path d="${arc}" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="2" stroke-dasharray="2 8" stroke-linecap="round"/>
        <path id="arc-lit" d="${arc}" pathLength="1" fill="none" stroke="url(#arcGrad)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="0 1"/>
        <circle id="sun-halo" r="19" cx="20" cy="120" fill="rgba(255,224,138,.35)"/>
        <circle id="sun-dot" r="9" cx="20" cy="120" fill="#ffe08a"/>
      </svg>
      <div class="sun-times"><span>Sunrise ${clock(daily.sunrise[0])}</span><span>Sunset ${clock(daily.sunset[0])}</span></div>
      <dl class="details">
        ${details.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
      </dl>
    </aside>`;
}

function hourlyHTML(data, u) {
  const { current, hourly } = data;
  const COL = 68;
  const startAt = Math.max(0, hourly.time.findIndex((t) => t.slice(0, 13) >= current.time.slice(0, 13)));
  const count = Math.min(24, hourly.time.length - startAt);
  const temps = [];
  for (let i = 0; i < count; i++) temps.push(u.t(hourly.temperature_2m[startAt + i]));
  const lo = Math.min(...temps);
  const hi = Math.max(...temps);
  const H = 104;
  const top = 28;
  const bottom = 12;
  const pts = temps.map((v, i) => [i * COL + COL / 2, top + (1 - (v - lo) / (hi - lo || 1)) * (H - top - bottom)]);
  const line = smoothPath(pts);
  const area = `${line} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;

  const labels = pts
    .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#fff"/><text x="${x}" y="${y - 11}" text-anchor="middle" class="chart-temp">${temps[i]}°</text>`)
    .join("");

  const cols = temps
    .map((_, i) => {
      const k = startAt + i;
      const h = info(hourly.weather_code[k], hourly.is_day[k]);
      const rain = hourly.precipitation_probability?.[k] ?? 0;
      return `<div class="hour">
        <div class="hi">${h.icon}</div>
        <div class="hr">${rain >= 10 ? rain + "%" : "&nbsp;"}</div>
        <div class="ht">${hourLabel(hourly.time[k], i === 0)}</div>
      </div>`;
    })
    .join("");

  return `<div class="glass panel reveal" style="--i:5">
    <h3>Next 24 hours</h3>
    <div class="scroll">
      <div class="hourly-inner" style="width:${count * COL}px">
        <svg class="chart" width="${count * COL}" height="${H}" viewBox="0 0 ${count * COL} ${H}" aria-hidden="true">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="rgba(255,255,255,.38)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/>
            </linearGradient>
          </defs>
          <path d="${area}" fill="url(#areaGrad)" class="area"/>
          <path d="${line}" pathLength="1" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" class="line"/>
          ${labels}
        </svg>
        <div class="hours">${cols}</div>
      </div>
    </div>
  </div>`;
}

function dailyHTML(data, u) {
  const { daily } = data;
  const weekMin = Math.min(...daily.temperature_2m_min);
  const weekMax = Math.max(...daily.temperature_2m_max);
  const span = Math.max(weekMax - weekMin, 1);
  const rows = daily.time
    .map((date, i) => {
      const d = info(daily.weather_code[i], 1);
      const lo = daily.temperature_2m_min[i];
      const hi = daily.temperature_2m_max[i];
      const left = ((lo - weekMin) / span) * 100;
      const width = Math.max(((hi - lo) / span) * 100, 8);
      return `<div class="day">
        <span class="name">${dayLabel(date, i)}</span>
        <span class="di">${d.icon}</span>
        <span class="drain">${daily.precipitation_probability_max[i] ?? 0}%</span>
        <div class="bar">
          <span class="lo">${u.t(lo)}°</span>
          <div class="track"><div class="fill" style="left:${left}%;width:${width}%;animation-delay:${0.6 + i * 0.07}s"></div></div>
          <span class="hi">${u.t(hi)}°</span>
        </div>
      </div>`;
    })
    .join("");
  return `<div class="glass panel reveal" style="--i:6"><h3>7-day forecast</h3>${rows}</div>`;
}

/* ---------- Main render ---------- */
export function render(data, unit) {
  const u = units(unit);
  const { current, daily } = data;
  const content = $("#content");

  content.innerHTML = `
    <section class="hero">
      ${heroHTML(data, u)}
      ${sunCardHTML(data, u)}
    </section>
    ${hourlyHTML(data, u)}
    ${dailyHTML(data, u)}`;

  animateTemp(u.t(current.temperature_2m));

  const rise = minutes(daily.sunrise[0]);
  const set = minutes(daily.sunset[0]);
  const nowMin = minutes(current.time);
  const isDaytime = nowMin >= rise && nowMin <= set;
  animateSun(clamp((nowMin - rise) / (set - rise), 0, 1), isDaytime);
  if (!isDaytime) $("#sun-dot")?.setAttribute("opacity", "0.4");

  // Replay the entrance animation for the new content
  content.classList.remove("enter");
  void content.offsetWidth;
  content.classList.add("enter");
}
