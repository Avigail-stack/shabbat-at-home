import { HebrewCalendar, Location, Zmanim, flags } from "@hebcal/core";
import { candleOffset } from "./candle-lighting";

export type CityLocation = { name: string; lat: number; lng: number };
export const FALLBACK_CITY: CityLocation = { name: "ירושלים", lat: 31.7683, lng: 35.2137 };
export function israelDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
function day(date: string, delta = 0) {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + delta); return d;
}
function holyDay(d: Date) {
  return d.getUTCDay() === 6 || HebrewCalendar.calendar({ start: d, end: d, il: true }).some((e) => (e.getFlags() & flags.CHAG) !== 0);
}
export function havdalah(date: string, city: CityLocation = FALLBACK_CITY) {
  const loc = new Location(city.lat, city.lng, true, "Asia/Jerusalem", city.name, "IL");
  return new Zmanim(loc, day(date), false).tzeit(8.5);
}
export function simulatedHavdalah(now: Date) {
  const d = day(israelDate(now));
  d.setUTCDate(d.getUTCDate() + ((6-d.getUTCDay()+7)%7));
  return new Date(havdalah(d.toISOString().slice(0,10)).getTime()+3600000);
}
/** Consecutive Israeli Yom Tov/Shabbat days form a single protected interval. */
export function deferredUntil(now: Date, city: CityLocation = FALLBACK_CITY): Date | null {
  const today = israelDate(now);
  for (let offset = -8; offset <= 1; offset++) {
    const startDay = day(today, offset);
    if (!holyDay(startDay) || holyDay(day(israelDate(startDay), -1))) continue;
    let endDay = startDay;
    for (let i = 0; i < 8 && holyDay(day(israelDate(endDay), 1)); i++) endDay = day(israelDate(endDay), 1);
    const eve = day(israelDate(startDay), -1);
    const loc = new Location(city.lat, city.lng, true, "Asia/Jerusalem", city.name, "IL");
    const start = new Zmanim(loc, eve, false).sunsetOffset(-candleOffset(city.name), true);
    const end = havdalah(israelDate(endDay), city);
    if (now >= start && now < end) return end;
  }
  return null;
}