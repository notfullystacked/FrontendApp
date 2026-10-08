// Filmsiden: film.html?id=3
import { api } from "../api.js";
import { mountLayout, emptyState, poster, ageBadge, statusBadge, movieFacts } from "../ui.js";
import { el, formatDay, formatTime, formatDate, getParam } from "../format.js";

await mountLayout({ area: "kunde", active: "" });

const container = document.getElementById("film");
const movieId = getParam("id");

try {
    // Filmen og dens forestillinger hentes samtidig
    const [movie, showings] = await Promise.all([
        api("/api/movies/" + movieId),
        api("/api/movies/" + movieId + "/showings"),
    ]);
    document.title = movie.name + " | Kino";

    container.replaceChildren(el("div", { class: "row g-5" }, [
        el("div", { class: "col-4" }, poster(movie)),
        el("div", { class: "col-8" }, [
            el("div", { class: "kino-hero-tags" }, [statusBadge(movie.status), ageBadge(movie.ageRestriction)]),
            el("h1", { class: "mt-3" }, movie.name),
            movieFacts(movie, { withDirector: true }),
            el("p", { class: "mt-4 fs-5" }, movie.description || ""),
            movie.status === "COMING_SOON"
                ? el("p", { class: "text-secondary" }, "Premiere i Kino " + formatDate(movie.premiereDate) + ".")
                : null,
            movie.status === "ARCHIVED"
                ? el("p", { class: "text-secondary" }, "Filmen er taget af programmet.")
                : null,
            el("h2", { class: "mt-5 mb-3" }, "Forestillinger"),
            showingList(showings),
        ]),
    ]));
} catch (error) {
    // 404 fra backenden giver beskeden "Film findes ikke: ..."
    container.replaceChildren(
        el("h1", {}, "Filmen blev ikke fundet"),
        emptyState(error.message),
        el("a", { class: "btn btn-primary mt-4", href: "index.html" }, "Til forsiden"),
    );
}

// Forestillingerne dag for dag, hver tid som en knap
function showingList(showings) {
    if (showings.length === 0) {
        return emptyState("Der er ingen kommende forestillinger for denne film.");
    }
    const days = new Map();
    for (const showing of showings) {
        const date = showing.startTime.substring(0, 10);
        if (!days.has(date)) days.set(date, []);
        days.get(date).push(showing);
    }
    const wrapper = el("div", { class: "d-flex flex-column gap-3" });
    for (const list of days.values()) {
        wrapper.append(el("div", {}, [
            el("div", { class: "kino-day-title fs-6 mb-2" }, formatDay(list[0].startTime)),
            el("div", { class: "kino-times" }, list.map(showing => {
                const soldOut = showing.availableSeats === 0;
                return el("a", {
                    class: "kino-time" + (soldOut ? " is-soldout" : ""),
                    href: soldOut ? null : "booking.html?showing=" + showing.id,
                    "aria-disabled": soldOut ? "true" : null,
                }, [
                    el("strong", {}, formatTime(showing.startTime)),
                    el("span", {}, soldOut ? "Udsolgt" : showing.auditoriumName),
                ]);
            })),
        ]));
    }
    return wrapper;
}
