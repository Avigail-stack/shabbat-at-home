import { Location, Zmanim } from "@hebcal/core";

export function candleOffset(city: string) {
  return city === "ירושלים" ? 40 : city === "חיפה" || city === "צפת" ? 30 : 18;
}
export function candleLighting(date: string, city: string, lat: number, lng: number) {
  const friday = new Date(`${date}T12:00:00Z`);
  friday.setUTCDate(friday.getUTCDate() - 1);
  const location = new Location(lat, lng, true, "Asia/Jerusalem", city, "IL");
  const time = new Zmanim(location, friday, false).sunsetOffset(-candleOffset(city), true);
  if (!Number.isFinite(time.getTime())) throw new Error("candle_time_unavailable");
  return time;
}
export function candleTimeLabel(time: string) {
  return new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(time));
}