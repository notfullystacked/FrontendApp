// Salene og deres kapacitet (ISSUE-9).
import { api } from "../api.js";
import { mountLayout, emptyState } from "../ui.js";
import { el } from "../format.js";

await mountLayout({ area: "kunde", active: "sale" });

const container = document.getElementById("halls");

try {
    const auditoriums = await api("/api/auditoriums");
    if (auditoriums.length === 0) {
        container.replaceChildren(emptyState("Der er ikke oprettet nogen sale endnu."));
    } else {
        container.replaceChildren(...auditoriums.map(hall));
    }
} catch (error) {
    container.replaceChildren(emptyState(error.message));
}

function hall(auditorium) {
    return el("section", { class: "kino-panel kino-hall" }, [
        el("div", {}, [
            el("h2", {}, auditorium.auditoriumName),
            // capacity regnes ud i backenden som rækker × sæder pr. række
            el("div", { class: "kino-hall-number" }, auditorium.capacity + " pladser"),
            el("p", { class: "text-secondary mt-2 mb-0" },
                auditorium.rowCount + " rækker med " + auditorium.seatsPerRow + " sæder i hver."),
            auditorium.active ? null : el("p", { class: "mt-2 mb-0" }, el("span", { class: "kino-pill kino-pill-bad" }, "Lukket lige nu")),
        ]),
        miniMap(auditorium),
    ]);
}

// En lille tegning af salen: ét felt pr. sæde. Kun pynt, så skærmlæsere springer den over
function miniMap(auditorium) {
    const map = el("div", {
        class: "kino-minimap",
        style: "grid-template-columns: repeat(" + auditorium.seatsPerRow + ", 1fr)",
        "aria-hidden": "true",
    });
    for (let i = 0; i < auditorium.capacity; i++) map.append(el("i"));
    return map;
}
