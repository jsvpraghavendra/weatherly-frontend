import test from "node:test";
import assert from "node:assert/strict";
import { info, skyState, PREVIEWS } from "./weather.js";

test("weather info mapping for clear sky", () => {
  const dayClear = info(0, 1);
  assert.equal(dayClear.text, "Clear sky");
  assert.equal(dayClear.icon, "☀️");

  const nightClear = info(0, 0);
  assert.equal(nightClear.text, "Clear sky");
  assert.equal(nightClear.icon, "🌙");
});

test("weather info mapping for rain and storm", () => {
  const rain = info(61, 1);
  assert.equal(rain.text, "Rain");
  assert.equal(rain.icon, "🌧️");

  const storm = info(95, 1);
  assert.equal(storm.text, "Thunderstorm");
  assert.equal(storm.icon, "⛈️");
});

test("skyState returns appropriate sky theme and targets", () => {
  const clearDay = skyState(0, 1);
  assert.equal(clearDay.sky, "clear");
  assert.ok(clearDay.target.sun > 0);

  const rainDay = skyState(65, 1);
  assert.equal(rainDay.sky, "rain");
  assert.ok(rainDay.target.rain > 0);

  const night = skyState(0, 0);
  assert.equal(night.sky, "night");
  assert.ok(night.target.moon > 0);
});

test("PREVIEWS contains expected sky presets", () => {
  assert.ok(PREVIEWS.clear);
  assert.ok(PREVIEWS.cloudy);
  assert.ok(PREVIEWS.rain);
  assert.ok(PREVIEWS.storm);
  assert.ok(PREVIEWS.snow);
  assert.ok(PREVIEWS.night);
});
