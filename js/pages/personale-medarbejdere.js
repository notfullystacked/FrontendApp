// Medarbejdere: opret, ret, slet og giv roller. Kun Admin.
import { api } from "../api.js";
import { startStaffPage } from "../staff.js";
import { showToast, showError, confirmDialog, emptyState } from "../ui.js";
import { el } from "../format.js";

const employee = await startStaffPage("medarbejdere");

const list = document.getElementById("list");
const form = document.getElementById("employeeForm");
const rolesBox = document.getElementById("roles");
let modal = null;
let editingId = null;

if (employee) {
    modal = new bootstrap.Modal(document.getElementById("employeeModal"));
    await loadRoles();
    await load();
    document.getElementById("newBtn").addEventListener("click", () => openForm(null));
    form.addEventListener("submit", save);
}

// Rollerne hentes fra backenden, så en ny rolle i databasen dukker op her uden kodeændringer
async function loadRoles() {
    try {
        for (const role of await api("/api/employees/roles")) {
            const id = "role-" + role;
            rolesBox.append(el("div", { class: "form-check" }, [
                el("input", { class: "form-check-input", type: "checkbox", id, value: role }),
                el("label", { class: "form-check-label", for: id }, role),
            ]));
        }
    } catch (error) {
        showError(error);
    }
}

async function load() {
    try {
        const employees = await api("/api/employees");
        if (employees.length === 0) {
            list.replaceChildren(emptyState("Der er ingen medarbejdere."));
            return;
        }
        list.replaceChildren(el("table", { class: "table kino-table" }, [
            el("thead", {}, el("tr", {}, [
                el("th", {}, "Navn"), el("th", {}, "Brugernavn"), el("th", {}, "Email"), el("th", {}, "Telefon"),
                el("th", {}, "Roller"), el("th", { class: "text-end" }, "Handlinger"),
            ])),
            el("tbody", {}, employees.map(row)),
        ]));
    } catch (error) {
        list.replaceChildren(emptyState(error.message));
    }
}

function row(person) {
    return el("tr", {}, [
        el("td", {}, el("strong", {}, person.name)),
        el("td", {}, person.username),
        el("td", {}, person.email),
        el("td", {}, person.phoneNr || ""),
        el("td", {}, person.roles.join(", ")),
        el("td", {}, el("div", { class: "kino-actions" }, [
            el("button", { class: "btn btn-sm btn-outline-light", type: "button", onclick: () => openForm(person) }, "Ret"),
            el("button", { class: "btn btn-sm btn-danger", type: "button", onclick: () => remove(person) }, "Slet"),
        ])),
    ]);
}

function openForm(person) {
    editingId = person ? person.id : null;
    form.classList.remove("was-validated");
    document.getElementById("employeeModalTitle").textContent = person ? "Ret medarbejder" : "Opret medarbejder";
    document.getElementById("name").value = person ? person.name : "";
    document.getElementById("username").value = person ? person.username : "";
    document.getElementById("email").value = person ? person.email : "";
    document.getElementById("phoneNr").value = person && person.phoneNr ? person.phoneNr : "";
    const password = document.getElementById("password");
    password.value = "";
    // Ved oprettelse er adgangskoden påkrævet. Ved rettelse betyder et tomt felt: behold den gamle
    password.required = !person;
    document.getElementById("passwordHelp").textContent = person ? "Lad feltet stå tomt for at beholde den nuværende adgangskode." : "";
    for (const checkbox of rolesBox.querySelectorAll("input")) {
        checkbox.checked = person ? person.roles.includes(checkbox.value) : false;
    }
    modal.show();
}

async function save(event) {
    event.preventDefault();
    if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
    }
    const roles = [...rolesBox.querySelectorAll("input:checked")].map(checkbox => checkbox.value);
    const body = {
        name: document.getElementById("name").value.trim(),
        username: document.getElementById("username").value.trim(),
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value || null,
        phoneNr: document.getElementById("phoneNr").value.trim() || null,
        birthday: null,
        roles: roles,
    };
    try {
        if (editingId === null) {
            await api("/api/employees", { method: "POST", body });
            showToast("Medarbejder oprettet");
        } else {
            await api("/api/employees/" + editingId, { method: "PUT", body });
            showToast("Medarbejder gemt");
        }
        modal.hide();
        await load();
    } catch (error) {
        showError(error);
    }
}

async function remove(person) {
    const ok = await confirmDialog("Slet " + person.name + "?", "Medarbejderen kan ikke længere logge ind.", "Slet");
    if (!ok) return;
    try {
        await api("/api/employees/" + person.id, { method: "DELETE" });
        showToast("Medarbejder slettet");
        await load();
    } catch (error) {
        showError(error);   // fx 409: "Du kan ikke slette dig selv"
    }
}
