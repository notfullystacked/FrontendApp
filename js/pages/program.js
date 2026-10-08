// Programmet: alle kommende forestillinger, samlet dag for dag.
import { api } from "../api.js";
import { mountLayout, emptyState, ageBadge } from "../ui.js";
import { el, formatDay, formatTime, genreName, formatRunTime } from "../format.js";

await mountLayout({ area: "kunde", active: "program" });

const container = document.getElementById("program");

try {
    const showings = await api("/api/showings");
    if (showings.length === 0) {
        container.replaceChildren(emptyState("Der er ingen forestillinger på programmet lige nu."));
    } else {
        // Backenden sender forestillingerne sorteret efter tid. Her deles de op pr. dato ("2026-10-09")
        const days = new Map();
        for (const showing of showings) {
            const date = showing.startTime.substring(0, 10);
            if (!days.has(date)) days.set(date, []);
            days.get(date).push(showing);
        }
        const sections = [];
        for (const list of days.values()) {
            sections.push(el("section", { class: "kino-day" }, [
                el("h2", { class: "kino-day-title" }, formatDay(list[0].startTime)),
                ...list.map(showingRow),
            ]));
        }
        container.replaceChildren(...sections);
    }
} catch (error) {
    container.replaceChildren(emptyState(error.message));
}

function showingRow(showing) {
    const soldOut = showing.availableSeats === 0;
    return el("div", { class: "kino-showing" }, [
        el("div", { class: "kino-showing-time" }, formatTime(showing.startTime)),
        el("div", {}, [
            el("a", { class: "kino-showing-title", href: "film.html?id=" + showing.movieId }, showing.movieName),
            el("div", { class: "kino-showing-meta" },
                [showing.auditoriumName, genreName(showing.genre), formatRunTime(showing.runTimeSeconds)].filter(Boolean).join(", ")),
        ]),
        ageBadge(showing.ageRestriction),
        soldOut
            ? el("span", { class: "kino-soldout" }, "Udsolgt")
            : el("a", { class: "btn btn-primary", href: "booking.html?showing=" + showing.id }, "Vælg sæder"),
    ]);
}
