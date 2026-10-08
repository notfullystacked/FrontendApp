// Dansk formatering af datoer, klokkeslæt, priser og spilletid.
// Intl er indbygget i browseren, så der skal ikke hentes noget bibliotek.

const dayFormat = new Intl.DateTimeFormat("da-DK", { weekday: "long", day: "numeric", month: "long" });
const shortDayFormat = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short" });
const dateFormat = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric" });

// "2026-10-09T20:00:00" -> "fredag 9. oktober"
export function formatDay(isoDateTime) {
    return dayFormat.format(new Date(isoDateTime));
}

// "2026-10-09T20:00:00" -> "9. okt."
export function formatShortDay(isoDateTime) {
    return shortDayFormat.format(new Date(isoDateTime));
}

// "2026-10-09" -> "9. oktober 2026"
export function formatDate(isoDate) {
    if (!isoDate) return "";
    return dateFormat.format(new Date(isoDate));
}

// "2026-10-09T20:00:00" -> "20.00"
export function formatTime(isoDateTime) {
    const date = new Date(isoDateTime);
    return String(date.getHours()).padStart(2, "0") + "." + String(date.getMinutes()).padStart(2, "0");
}

// "2026-10-09T20:00:00" -> "fredag 9. oktober kl. 20.00"
export function formatDayAndTime(isoDateTime) {
    return formatDay(isoDateTime) + " kl. " + formatTime(isoDateTime);
}

// 120 -> "120 kr."
export function formatPrice(kroner) {
    return new Intl.NumberFormat("da-DK").format(kroner) + " kr.";
}

// Backenden gemmer spilletid i sekunder: 7440 -> "2 t 4 min"
export function formatRunTime(seconds) {
    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return rest + " min";
    if (rest === 0) return hours + " t";
    return hours + " t " + rest + " min";
}

// 8.1 -> "8,1"
export function formatRating(rating) {
    return new Intl.NumberFormat("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);
}

// Dato som "2026-10-09" i lokal tid (bruges til ?date= og til at gruppere forestillinger pr. dag)
export function toIsoDate(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

// Genrerne kommer fra backenden som engelske enum-navne. Her er de danske navne
const GENRES = {
    ACTION: "Action",
    ANIMATION: "Animation",
    COMEDY: "Komedie",
    DOCUMENTARY: "Dokumentar",
    DRAMA: "Drama",
    FAMILY: "Familie",
    HORROR: "Gyser",
    ROMANCE: "Romantik",
    SCIFI: "Science fiction",
    THRILLER: "Thriller",
};
export function genreName(genre) {
    if (!genre) return "";
    return GENRES[genre] || genre;
}

const STATUSES = {
    COMING_SOON: "Kommer snart",
    PREMIERE: "Premiere",
    NOW_SHOWING: "På programmet",
    ARCHIVED: "Taget af programmet",
};
export function statusName(status) {
    return STATUSES[status] || "";
}

// Læser en værdi fra adressen: film.html?id=3 -> getParam("id") giver "3"
export function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

// Laver et HTML-element. Tekst sættes med textContent, så indhold fra backenden
// aldrig bliver læst som HTML (det beskytter mod XSS).
//   el("p", { class: "lead" }, "Hej")      el("ul", {}, [el("li", {}, "A"), el("li", {}, "B")])
export function el(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
        if (value === false || value === null || value === undefined) continue;
        if (name === "class") element.className = value;
        else if (name.startsWith("on")) element.addEventListener(name.substring(2), value);
        else if (value === true) element.setAttribute(name, "");
        else element.setAttribute(name, value);
    }
    const list = Array.isArray(children) ? children : [children];
    for (const child of list) {
        if (child === null || child === undefined || child === false) continue;
        element.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return element;
}

// Et ikon fra Bootstrap Icons, fx icon("ticket-perforated"). aria-hidden, fordi der altid står tekst ved siden af
export function icon(name) {
    return el("i", { class: "bi bi-" + name, "aria-hidden": "true" });
}
