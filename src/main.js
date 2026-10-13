import "./style.css";
import { createScene } from "./scene.js";
import { skyState, PREVIEWS } from "./weather.js";
import { render } from "./ui.js";

const $ = (selector) => document.querySelector(selector);
const esc = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rawApiUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");
const scene = createScene($("#scene"));

/* ---------- Small helpers ---------- */
const store = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage not available */
    }
  }
};

let data = null;
let unit = store.get("unit", "c");
let recent = store.get("recent", []);

function setStatus(message, kind = "") {
  const el = $("#status");
  el.textContent = message;
  el.className = "status " + kind;
}

/* ---------- Sky ---------- */
function setSky(code, isDay, cloudCover) {
  const { sky, target } = skyState(code, isDay, cloudCover);
  document.body.dataset.sky = sky;
  document.querySelectorAll(".layer").forEach((layer) => layer.classList.toggle("active", layer.dataset.sky === sky));
  scene.set(target);
}

function markPreview(name) {
  document.querySelectorAll("#preview button").forEach((b) => b.classList.toggle("on", b.dataset.preview === name));
}

/* ---------- Units ---------- */
function markUnit() {
  document.querySelectorAll("#unit button").forEach((b) => b.classList.toggle("on", b.dataset.unit === unit));
}

/* ---------- Recent searches ---------- */
function renderRecent() {
  $("#recent").innerHTML = recent
    .map((p, i) => `<button type="button" class="chip" data-i="${i}">${esc(p.name)}</button>`)
    .join("");
}

function remember(d) {
  const place = { name: d.city, region: d.region, country: d.country, lat: d.lat, lon: d.lon };
  recent = [place, ...recent.filter((p) => !(p.name === place.name && p.region === place.region && p.country === place.country))].slice(0, 5);
  store.set("recent", recent);
  renderRecent();
}

/* ---------- Loading weather from the backend ---------- */
async function request(query) {
  setStatus("Fetching forecast...", "loading");
  $("#content").classList.add("busy");
  try {
    const res = await fetch(`${API_BASE_URL}/api/weather?${query}`);
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      /* not JSON */
    }
    if (!res.ok) {
      throw new Error((body && body.message) || (res.status === 404 ? "City not found." : "Unable to retrieve weather forecast."));
    }
    data = body;
    setStatus("");
    markPreview("");
    show();
    remember(data);
  } catch (err) {
    if (err instanceof TypeError) {
      setStatus(
        API_BASE_URL
          ? "Can't reach the weather backend. Check its URL and availability."
          : "Can't reach the backend. Start it first (see README.md).",
        "error"
      );
    } else {
      setStatus(err.message, "error");
    }
  } finally {
    $("#content").classList.remove("busy");
  }
}

function show() {
  if (!data || !data.current) return;
  setSky(data.current.weather_code, data.current.is_day, data.current.cloud_cover);
  render(data, unit);
}

const loadCity = (city) => request(new URLSearchParams({ city }).toString());
const loadPlace = (p) =>
  request(new URLSearchParams({ lat: p.lat, lon: p.lon, name: p.name, region: p.region || "", country: p.country || "" }).toString());

/* ---------- Search box with suggestions ---------- */
const input = $("#city");
const list = $("#suggest");
let suggestions = [];
let active = -1;
let timer;

function hideSuggest() {
  list.hidden = true;
  list.innerHTML = "";
  suggestions = [];
  active = -1;
}

function paintActive() {
  [...list.children].forEach((li, i) => li.classList.toggle("active", i === active));
}

function showSuggest(items) {
  suggestions = Array.isArray(items) ? items : [];
  active = -1;
  if (!suggestions.length) return hideSuggest();
  list.innerHTML = suggestions
    .map((p, i) => `<li data-i="${i}"><strong>${esc(p.name)}</strong><span>${esc([p.region, p.country].filter(Boolean).join(", "))}</span></li>`)
    .join("");
  list.hidden = false;
}

function choose(p) {
  input.value = p.name;
  hideSuggest();
  input.blur();
  loadPlace(p);
}

input.addEventListener("input", () => {
  clearTimeout(timer);
  const q = input.value.trim();
  if (q.length < 2) return hideSuggest();
  timer = setTimeout(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/cities?q=${encodeURIComponent(q)}`);
      if (!res.ok) return hideSuggest();
      const items = await res.json();
      if (Array.isArray(items) && input.value.trim() === q) {
        showSuggest(items);
      }
    } catch (e) {
      /* suggestions are optional */
    }
  }, 250);
});

input.addEventListener("keydown", (event) => {
  if (list.hidden) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    active = (active + 1) % suggestions.length;
    paintActive();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    active = (active - 1 + suggestions.length) % suggestions.length;
    paintActive();
  } else if (event.key === "Enter" && active >= 0) {
    event.preventDefault();
    choose(suggestions[active]);
  } else if (event.key === "Escape") {
    hideSuggest();
  }
});

list.addEventListener("mousedown", (event) => {
  event.preventDefault();
  const li = event.target.closest("li");
  if (li) choose(suggestions[Number(li.dataset.i)]);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-wrap")) hideSuggest();
});

$("#search").addEventListener("submit", (event) => {
  event.preventDefault();
  const city = input.value.trim();
  if (!city) {
    setStatus("Please enter a city name to search.", "error");
    return;
  }
  hideSuggest();
  input.blur();
  loadCity(city);
});

/* ---------- Buttons ---------- */
$("#recent").addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (chip) loadPlace(recent[Number(chip.dataset.i)]);
});

$("#unit").addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;
  unit = btn.dataset.unit;
  store.set("unit", unit);
  markUnit();
  if (data) render(data, unit);
});

$("#preview").addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;
  const name = btn.dataset.preview;
  const p = PREVIEWS[name];
  markPreview(name);
  setSky(p.code, p.isDay, null);
});

/* ---------- Start ---------- */
markUnit();
renderRecent();
if (recent.length) loadPlace(recent[0]);
else loadCity("London");
