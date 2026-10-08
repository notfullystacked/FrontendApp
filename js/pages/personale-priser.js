// Billetpriser: ret prisen på en billettype, eller opret en ny. Kun Admin.
import { api } from "../api.js";
import { startStaffPage } from "../staff.js";
import { showToast, showError, emptyState } from "../ui.js";
import { el } from "../format.js";

const employee = await startStaffPage("priser");
const list = document.getElementById("list");
const newForm = document.getElementById("newForm");

if (employee) {
    await load();
    newForm.addEventListener("submit", create);
}

async function load() {
    try {
        const types = await api("/api/ticket-types");
        if (types.length === 0) {
            list.replaceChildren(emptyState("Der er ingen billettyper endnu. Opret den første nedenfor."));
            return;
        }
        list.replaceChildren(el("table", { class: "table kino-table" }, [
            el("thead", {}, el("tr", {}, [
                el("th", {}, "Billettype"), el("th", {}, "Pris i kr."), el("th", { class: "text-end" }, "Handlinger"),
            ])),
            el("tbody", {}, types.map(row)),
        ]));
    } catch (error) {
        list.replaceChildren(emptyState(error.message));
    }
}

function row(type) {
    const nameInput = el("input", { class: "form-control", type: "text", value: type.ticketName, "aria-label": "Navn på billettype" });
    const priceInput = el("input", { class: "form-control", type: "number", min: "0", value: String(type.price), "aria-label": "Pris for " + type.ticketName });
    return el("tr", {}, [
        el("td", {}, nameInput),
        el("td", { style: "width: 160px" }, priceInput),
        el("td", {}, el("div", { class: "kino-actions" },
            el("button", { class: "btn btn-sm btn-primary", type: "button", onclick: () => save(type, nameInput, priceInput) }, "Gem"))),
    ]);
}

async function save(type, nameInput, priceInput) {
    const ticketName = nameInput.value.trim();
    const price = Number(priceInput.value);
    if (!ticketName || priceInput.value === "" || price < 0) {
        showError(new Error("Skriv et navn og en pris på 0 kr. eller mere."));
        return;
    }
    try {
        await api("/api/ticket-types/" + type.id, { method: "PUT", body: { ticketName, price } });
        showToast(ticketName + " koster nu " + price + " kr.");
        await load();
    } catch (error) {
        showError(error);
    }
}

async function create(event) {
    event.preventDefault();
    if (!newForm.checkValidity()) {
        newForm.classList.add("was-validated");
        return;
    }
    try {
        await api("/api/ticket-types", {
            method: "POST",
            body: {
                ticketName: document.getElementById("newName").value.trim(),
                price: Number(document.getElementById("newPrice").value),
            },
        });
        showToast("Billettype oprettet");
        newForm.reset();
        newForm.classList.remove("was-validated");
        await load();
    } catch (error) {
        showError(error);
    }
}
