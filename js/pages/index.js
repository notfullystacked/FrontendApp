// Forsiden: fremhævet film, dagens forestillinger, premierefilm og søgning.
import { api } from "../api.js";
import { mountLayout, showError, emptyState, poster, movieCard, ageBadge, statusBadge, movieFacts, hueFromText } from "../ui.js";
import { el, icon, formatTime, formatDate, toIsoDate, genreName } from "../format.js";

await mountLayout({ area: "kunde", active: "forside" });

// De tre dele hentes samtidig. Fejler én af dem, vises de andre stadig
loadHero();
loadToday();
loadPremieres();
setupSearch();

// ---------- Stort felt øverst: den film, biografen har valgt at fremhæve ----------
async function loadHero() {
    try {
        const promoted = await api("/api/movies/promoted");
        if (promoted.length === 0) return;   // ingen fremhævet film: feltet bliver bare ikke vist
        const movie = promoted[0];

        const text = document.getElementById("heroText");
        text.append(
            el("div", { class: "kino-hero-tags" }, [statusBadge(movie.status), ageBadge(movie.ageRestriction)]),
            el("h1", {}, movie.name),
            el("p", { class: "kino-hero-text" }, movie.description || ""),
            movieFacts(movie, { withDirector: true }),
            movie.status === "COMING_SOON"
                ? el("p", { class: "mt-3 mb-0" }, "Premiere " + formatDate(movie.premiereDate) + ". Billetterne er sat til salg.")
                : null,
            el("a", { class: "btn btn-primary btn-lg mt-4", href: "film.html?id=" + movie.id }, [icon("ticket-perforated"), " Se tider og bestil"]),
        );
        document.getElementById("heroPoster").append(poster(movie));
        const hero = document.getElementById("hero");
        // Feltets baggrund får samme farvetone som filmens plakat
        hero.style.setProperty("--poster-hue", hueFromText(movie.name));
        hero.hidden = false;
    } catch (error) {
        showError(error);
    }
}

// ---------- I dag: forestillinger samlet pr. film ----------
async function loadToday() {
    const container = document.getElementById("today");
    try {
        const showings = await api("/api/showings?date=" + toIsoDate(new Date()));
        if (showings.length === 0) {
            container.replaceChildren(emptyState("Der er ikke flere forestillinger i dag. Se programmet for de kommende dage."));
            return;
        }
        // Saml forestillingerne pr. film: { filmId: { name, showings: [...] } }
        const byMovie = new Map();
        for (const showing of showings) {
            if (!byMovie.has(showing.movieId)) byMovie.set(showing.movieId, []);
            byMovie.get(showing.movieId).push(showing);
        }
        const rows = [];
        for (const list of byMovie.values()) {
            const first = list[0];
            rows.push(el("div", { class: "kino-showing" }, [
                el("div", {}, ageBadge(first.ageRestriction)),
                el("div", {}, [
                    el("a", { class: "kino-showing-title", href: "film.html?id=" + first.movieId }, first.movieName),
                    el("div", { class: "kino-showing-meta" }, genreName(first.genre)),
                ]),
                el("div", { class: "kino-times" }, list.map(timeButton)),
            ]));
        }
        container.replaceChildren(...rows);
    } catch (error) {
        container.replaceChildren(emptyState(error.message));
    }
}

// En tid som knap. Udsolgte forestillinger kan ikke vælges
function timeButton(showing) {
    const soldOut = showing.availableSeats === 0;
    return el("a", {
        class: "kino-time" + (soldOut ? " is-soldout" : ""),
        href: soldOut ? null : "booking.html?showing=" + showing.id,
        "aria-disabled": soldOut ? "true" : null,
    }, [
        el("strong", {}, formatTime(showing.startTime)),
        el("span", {}, soldOut ? "Udsolgt" : showing.auditoriumName),
    ]);
}

// ---------- Premierefilm ----------
async function loadPremieres() {
    const container = document.getElementById("premieres");
    try {
        const movies = await api("/api/movies/premieres");
        if (movies.length === 0) {
            container.replaceChildren(emptyState("Ingen film har haft premiere de seneste 14 dage."));
            return;
        }
        container.replaceChildren(el("div", { class: "kino-grid" }, movies.map(movieCard)));
    } catch (error) {
        container.replaceChildren(emptyState(error.message));
    }
}

// ---------- Søgning og genre-filter ----------
async function setupSearch() {
    const input = document.getElementById("searchInput");
    const chips = document.getElementById("genreChips");
    const results = document.getElementById("searchResults");
    let selectedGenre = "";
    let timer = null;

    results.replaceChildren(emptyState("Skriv en titel eller vælg en genre for at finde en film."));

    async function search() {
        const text = input.value.trim();
        if (!text && !selectedGenre) {
            results.replaceChildren(emptyState("Skriv en titel eller vælg en genre for at finde en film."));
            return;
        }
        // URLSearchParams sørger for, at mellemrum og æøå bliver skrevet rigtigt i adressen
        const params = new URLSearchParams();
        if (text) params.set("search", text);
        if (selectedGenre) params.set("genre", selectedGenre);
        try {
            const movies = await api("/api/movies?" + params);
            if (movies.length === 0) {
                results.replaceChildren(emptyState("Ingen film på programmet passer til din søgning."));
            } else {
                results.replaceChildren(el("div", { class: "kino-grid" }, movies.map(movieCard)));
            }
        } catch (error) {
            results.replaceChildren(emptyState(error.message));
        }
    }

    // Vent 250 ms efter sidste tastetryk, så der ikke sendes et kald for hvert bogstav (debounce)
    input.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(search, 250);
    });

    try {
        const genres = await api("/api/movies/genres");
        for (const genre of genres) {
            const chip = el("button", { class: "kino-chip", type: "button", "aria-pressed": "false" }, genreName(genre));
            chip.addEventListener("click", () => {
                // Klik på den valgte genre igen fjerner filteret
                selectedGenre = selectedGenre === genre ? "" : genre;
                for (const other of chips.children) other.setAttribute("aria-pressed", "false");
                if (selectedGenre) chip.setAttribute("aria-pressed", "true");
                search();
            });
            chips.append(chip);
        }
    } catch (error) {
        showError(error);
    }
}
