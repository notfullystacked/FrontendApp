// Film: opret, ret, fjern, fremhæv og sæt premieredato (ISSUE-8 og ISSUE-10).
import { api } from "../api.js";
import { startStaffPage } from "../staff.js";
import { showToast, showError, confirmDialog, emptyState } from "../ui.js";
import { el, icon, genreName, statusName, formatDate } from "../format.js";

const employee = await startStaffPage("film");

const list = document.getElementById("list");
const form = document.getElementById("movieForm");
const modalElement = document.getElementById("movieModal");
let modal = null;
let editingId = null;   // null = vi opretter en ny film, ellers id'et på den film, der rettes
let editingReleaseDate = null;   // formularen har ikke feltet releaseDate, så den gamle værdi sendes med tilbage

if (employee) {
    modal = new bootstrap.Modal(modalElement);
    await loadGenres();
    await loadMovies();
    document.getElementById("newBtn").addEventListener("click", () => openForm(null));
    form.addEventListener("submit", saveMovie);
}

async function loadGenres() {
    const select = document.getElementById("genre");
    select.append(el("option", { value: "" }, "Ingen"));
    try {
        for (const genre of await api("/api/movies/genres")) {
            select.append(el("option", { value: genre }, genreName(genre)));
        }
    } catch (error) {
        showError(error);
    }
}

async function loadMovies() {
    try {
        // /all giver også film, der er taget af programmet
        const movies = await api("/api/movies/all");
        if (movies.length === 0) {
            list.replaceChildren(emptyState("Der er ingen film endnu. Klik på Opret film for at tilføje den første."));
            return;
        }
        movies.sort((a, b) => a.name.localeCompare(b.name, "da"));
        list.replaceChildren(el("table", { class: "table kino-table" }, [
            el("thead", {}, el("tr", {}, [
                el("th", {}, "Titel"), el("th", {}, "Genre"), el("th", {}, "Premiere"), el("th", {}, "Status"),
                el("th", { class: "text-end" }, "Handlinger"),
            ])),
            el("tbody", {}, movies.map(movieRow)),
        ]));
    } catch (error) {
        list.replaceChildren(emptyState(error.message));
    }
}

function movieRow(movie) {
    return el("tr", {}, [
        el("td", {}, el("strong", {}, movie.name)),
        el("td", {}, genreName(movie.genre)),
        el("td", {}, movie.premiereDate ? formatDate(movie.premiereDate) : ""),
        el("td", {}, [
            statusName(movie.status),
            movie.promoted ? el("div", { class: "kino-showing-meta" }, [icon("star-fill"), " Fremhævet"]) : null,
        ]),
        el("td", {}, el("div", { class: "kino-actions" }, [
            el("button", { class: "btn btn-sm btn-outline-light", type: "button", onclick: () => openForm(movie) }, "Ret"),
            movie.active
                ? el("button", { class: "btn btn-sm btn-gold", type: "button", onclick: () => setPromoted(movie, !movie.promoted) },
                    movie.promoted ? "Fjern fremhævning" : "Fremhæv")
                : null,
            movie.active
                ? el("button", { class: "btn btn-sm btn-outline-light", type: "button", onclick: () => deactivate(movie) }, "Tag af programmet")
                : el("button", { class: "btn btn-sm btn-outline-light", type: "button", onclick: () => activate(movie) }, "Sæt på programmet"),
            el("button", { class: "btn btn-sm btn-danger", type: "button", onclick: () => remove(movie) }, "Slet"),
        ])),
    ]);
}

// Åbner formularen. Med en film udfyldes felterne (ret), uden er den tom (opret)
function openForm(movie) {
    editingId = movie ? movie.id : null;
    editingReleaseDate = movie ? movie.releaseDate : null;
    form.classList.remove("was-validated");
    document.getElementById("movieModalTitle").textContent = movie ? "Ret film" : "Opret film";
    document.getElementById("name").value = movie ? movie.name : "";
    document.getElementById("genre").value = movie && movie.genre ? movie.genre : "";
    document.getElementById("description").value = movie && movie.description ? movie.description : "";
    // Backenden gemmer spilletid i sekunder, formularen bruger minutter
    document.getElementById("runTime").value = movie ? Math.round(movie.runTime / 60) : "";
    document.getElementById("ageRestriction").value = movie ? movie.ageRestriction : "";
    document.getElementById("imdbRating").value = movie && movie.imdbRating > 0 ? movie.imdbRating : "";
    document.getElementById("releaseYear").value = movie && movie.releaseYear > 0 ? movie.releaseYear : "";
    document.getElementById("director").value = movie && movie.director ? movie.director : "";
    document.getElementById("premiereDate").value = movie && movie.premiereDate ? movie.premiereDate : "";
    document.getElementById("posterUrl").value = movie && movie.posterUrl ? movie.posterUrl : "";
    modal.show();
}

// Et talfelt, der må være tomt: "" bliver til null i stedet for 0
function numberOrNull(id) {
    const value = document.getElementById(id).value;
    return value === "" ? null : Number(value);
}

async function saveMovie(event) {
    event.preventDefault();
    if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
    }
    const releaseYear = numberOrNull("releaseYear");
    // Felterne hedder det samme som i backendens MovieRequest
    const movie = {
        name: document.getElementById("name").value.trim(),
        runTime: Number(document.getElementById("runTime").value) * 60,
        description: document.getElementById("description").value.trim(),
        imdbRating: numberOrNull("imdbRating"),
        director: document.getElementById("director").value.trim(),
        releaseYear: releaseYear,
        releaseDate: editingReleaseDate,
        ageRestriction: numberOrNull("ageRestriction"),
        genre: document.getElementById("genre").value || null,
        premiereDate: document.getElementById("premiereDate").value || null,
        posterUrl: document.getElementById("posterUrl").value.trim() || null,
    };
    try {
        if (editingId === null) {
            await api("/api/movies", { method: "POST", body: movie });
            showToast("Film oprettet");
        } else {
            await api("/api/movies/" + editingId, { method: "PUT", body: movie });
            showToast("Film gemt");
        }
        modal.hide();
        await loadMovies();
    } catch (error) {
        showError(error);
    }
}

async function setPromoted(movie, promoted) {
    try {
        await api("/api/movies/" + movie.id + (promoted ? "/promote" : "/unpromote"), { method: "PUT" });
        showToast(promoted ? movie.name + " er fremhævet" : "Fremhævningen er fjernet");
        await loadMovies();
    } catch (error) {
        showError(error);
    }
}

async function deactivate(movie) {
    const ok = await confirmDialog("Tag " + movie.name + " af programmet?",
        "Filmen skjules for kunderne, og alle dens kommende forestillinger bliver aflyst.", "Tag af programmet");
    if (!ok) return;
    try {
        await api("/api/movies/" + movie.id + "/deactivate", { method: "PUT" });
        showToast(movie.name + " er taget af programmet");
        await loadMovies();
    } catch (error) {
        showError(error);
    }
}

async function activate(movie) {
    try {
        await api("/api/movies/" + movie.id + "/activate", { method: "PUT" });
        showToast(movie.name + " er på programmet igen");
        await loadMovies();
    } catch (error) {
        showError(error);
    }
}

async function remove(movie) {
    const ok = await confirmDialog("Slet " + movie.name + "?",
        "Filmen slettes helt og kan ikke hentes tilbage. Film, der har forestillinger, kan ikke slettes. Dem tager du af programmet i stedet.", "Slet");
    if (!ok) return;
    try {
        await api("/api/movies/" + movie.id, { method: "DELETE" });
        showToast("Film slettet");
        await loadMovies();
    } catch (error) {
        showError(error);   // 409: "Filmen har forestillinger og kan ikke slettes ..."
    }
}
