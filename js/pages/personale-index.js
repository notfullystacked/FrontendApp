// Oversigten for personalet: én flise pr. side, medarbejderen må bruge.
import { startStaffPage } from "../staff.js";
import { STAFF_PAGES, mayUse } from "../ui.js";
import { el, icon } from "../format.js";

const DESCRIPTIONS = {
    film: "Opret, ret og fjern film. Fremhæv film og sæt premieredato.",
    forestillinger: "Planlæg nye forestillinger, og aflys dem, der ikke skal vises.",
    bookinger: "Find en booking, og registrér betaling.",
    billetkontrol: "Tjek billetter ved indgangen.",
    sale: "Markér, om en sal er ren eller skal gøres ren.",
    medarbejdere: "Opret medarbejdere, og giv dem roller.",
    priser: "Ret priserne på billettyperne.",
};

const employee = await startStaffPage("oversigt");
if (employee) {
    document.getElementById("welcome").textContent = "Hej " + employee.name;
    document.getElementById("roles").textContent = "Dine roller: " + employee.roles.join(", ") + ". Du ser kun de sider, de giver adgang til.";
    const tiles = document.getElementById("tiles");
    for (const page of STAFF_PAGES) {
        if (page.key === "oversigt" || !mayUse(employee, page.roles)) continue;
        // Linkene i STAFF_PAGES er skrevet fra projektets rod. Vi står allerede i personale/
        const href = page.href.replace("personale/", "");
        tiles.append(el("div", { class: "col-4" }, el("a", { class: "kino-tile", href }, [
            icon(page.icon),
            el("h2", {}, page.text),
            el("p", {}, DESCRIPTIONS[page.key] || ""),
        ])));
    }
}
