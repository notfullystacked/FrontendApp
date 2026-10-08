// Rengøring: se salene, og skift mellem "ren" og "skal gøres ren".
import { api } from "../api.js";
import { startStaffPage } from "../staff.js";
import { showToast, showError, emptyState } from "../ui.js";
import { el } from "../format.js";

const employee = await startStaffPage("sale");
const list = document.getElementById("list");

if (employee) {
    await load();
}

async function load() {
    try {
        const auditoriums = await api("/api/auditoriums");
        if (auditoriums.length === 0) {
            list.replaceChildren(emptyState("Der er ikke oprettet nogen sale."));
            return;
        }
        list.replaceChildren(el("table", { class: "table kino-table" }, [
            el("thead", {}, el("tr", {}, [
                el("th", {}, "Sal"), el("th", {}, "Rækker"), el("th", {}, "Sæder pr. række"), el("th", {}, "Pladser"),
                el("th", {}, "Rengøring"), el("th", { class: "text-end" }, "Handlinger"),
            ])),
            el("tbody", {}, auditoriums.map(row)),
        ]));
    } catch (error) {
        list.replaceChildren(emptyState(error.message));
    }
}

function row(auditorium) {
    const clean = auditorium.cleaningStatus === "CLEAN";
    return el("tr", {}, [
        el("td", {}, el("strong", {}, auditorium.auditoriumName)),
        el("td", {}, String(auditorium.rowCount)),
        el("td", {}, String(auditorium.seatsPerRow)),
        el("td", {}, String(auditorium.capacity)),
        el("td", {}, clean
            ? el("span", { class: "kino-pill kino-pill-ok" }, "Ren")
            : el("span", { class: "kino-pill kino-pill-wait" }, "Skal gøres ren")),
        el("td", {}, el("div", { class: "kino-actions" }, clean
            ? el("button", { class: "btn btn-sm btn-outline-light", type: "button", onclick: () => setStatus(auditorium, "needs-cleaning") }, "Skal gøres ren")
            : el("button", { class: "btn btn-sm btn-primary", type: "button", onclick: () => setStatus(auditorium, "clean") }, "Markér som ren"))),
    ]);
}

async function setStatus(auditorium, action) {
    try {
        await api("/api/auditoriums/" + auditorium.id + "/" + action, { method: "PUT" });
        showToast(auditorium.auditoriumName + (action === "clean" ? " er markeret som ren" : " skal gøres ren"));
        await load();
    } catch (error) {
        showError(error);
    }
}
