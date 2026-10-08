// Adressen på backenden.
// Når siden åbnes fra IntelliJ (http://localhost:63342/...), ligger backenden på en anden port,
// så vi skriver hele adressen. Det er derfor, backenden skal tillade os med CORS.
// Når frontenden kører i Docker (port 3000), sender nginx selv /api videre til backenden,
// så der bruges en tom adresse: kaldene går til samme server, som siden kom fra.
export const API_BASE = window.location.port === "3000" ? "" : "http://localhost:8080";

// Hvor ofte sædekortet henter optagne sæder igen (i millisekunder)
export const SEAT_REFRESH_MS = 30000;
