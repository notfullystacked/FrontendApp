// Forestillinger: planlæg og aflys.
import { api } from "../api.js";
import { startStaffPage } from "../staff.js";
import { showToast, showError, confirmDialog, emptyState } from "../ui.js";
import { el, formatDayAndTime } from "../format.js";

const employee = await startStaffPage("forestillinger");

const list = document.getElementById("list");
const form = document.getElementById("showingForm");

if (employee) {
    await loadChoices();
    await loadShowings();
    form.addEventListener("submit", createShowing);
}

// Fylder de to dropdowns med film og sale
async function loadChoices() {
    try {
        const [movies, auditoriums] = await Promise.all([api("/api/movies"), api("/api/auditoriums")]);
        const movieSelect = document.getElementById("movie");
        movieSelect.append(el("option", { value: "" }, "Vælg film"));
        for (const movie of movies) movieSelect.append(el("option", { value: movie.id }, movie.name));

        const auditoriumSelect = document.getElementById("auditorium");
        auditoriumSelect.append(el("option", { value: "" }, "Vælg sal"));
        for (const auditorium of auditoriums) {
            if (auditorium.active) {
                auditoriumSelect.append(el("option", { value: auditorium.id },
                    auditorium.auditoriumName + " (" + auditorium.capacity + " pladser)"));
            }
        }
    } catch (error) {
        showError(error);
    }
}

async function loadShowings() {
    try {
        const all = await api("/api/showings/all");
        // Kun kommende forestillinger vises. Aflyste er med, så man kan se, at de er aflyst
        const now = new Date();
        const upcoming = all.filter(showing => new Date(showing.startTime) > now);
        if (upcoming.length === 0) {
            list.replaceChildren(emptyState("Der er ingen kommende forestillinger. Planlæg den første i formularen ovenfor."));
            return;
        }
        list.replaceChildren(el("table", { class: "table kino-table" }, [
            el("thead", {}, el("tr", {}, [
                el("th", {}, "Tid"), el("th", {}, "Film"), el("th", {}, "Sal"), el("th", {}, "Solgt"),
                el("th", {}, "Status"), el("th", { class: "text-end" }, "Handlinger"),
            ])),
            el("tbody", {}, upcoming.map(showingRow)),
        ]));
    } catch (error) {
        list.replaceChildren(emptyState(error.message));
    }
}

function showingRow(showing) {
    const cancelled = showing.status === "CANCELLED";
    return el("tr", {}, [
        el("td", { class: "kino-capital" }, formatDayAndTime(showing.startTime)),
        el("td", {}, el("strong", {}, showing.movieName)),
        el("td", {}, showing.auditoriumName),
        el("td", {}, (showing.capacity - showing.availableSeats) + " af " + showing.capacity),
        el("td", {}, cancelled
            ? el("span", { class: "kino-pill kino-pill-bad" }, "Aflyst")
            : el("span", { class: "kino-pill kino-pill-ok" }, "Planlagt")),
        el("td", {}, el("div", { class: "kino-actions" },
            cancelled ? [] : el("button", { class: "btn btn-sm btn-danger", type: "button", onclick: () => cancel(showing) }, "Aflys"))),
    ]);
}

async function createShowing(event) {
    event.preventDefault();
    if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
    }
    try {
        await api("/api/showings", {
            method: "POST",
            body: {
                movieId: Number(document.getElementById("movie").value),
                auditoriumId: Number(document.getElementById("auditorium").value),
                // datetime-local giver "2026-11-01T19:00". Backenden vil også have sekunder med
                startTime: document.getElementById("startTime").value + ":00",
            },
        });
        showToast("Forestilling planlagt");
        form.classList.remove("was-validated");
        document.getElementById("startTime").value = "";
        await loadShowings();
    } catch (error) {
        showError(error);   // fx 409: "Salen er optaget af ..."
    }
}

async function cancel(showing) {
    const sold = showing.capacity - showing.availableSeats;
    const ok = await confirmDialog("Aflys forestillingen?",
        showing.movieName + ", " + formatDayAndTime(showing.startTime) + ". "
        + (sold > 0 ? "Der er solgt " + sold + " billetter, og kunderne skal have besked." : "Der er ikke solgt nogen billetter."),
        "Aflys");
    if (!ok) return;
    try {
        await api("/api/showings/" + showing.id + "/cancel", { method: "PUT" });
        showToast("Forestilling aflyst");
        await loadShowings();
    } catch (error) {
        showError(error);
    }
}
