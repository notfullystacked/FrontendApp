// Bestilling i tre trin: booking.html?showing=2
//   1. Vælg sæder   2. Dine oplysninger   3. Bekræft
// Alt, hvad brugeren har valgt, ligger i objektet "state". Hver gang noget ændres, tegnes resuméet igen.
import { api } from "../api.js";
import { SEAT_REFRESH_MS } from "../config.js";
import { mountLayout, getCustomer, showToast, showError, emptyState } from "../ui.js";
import { el, formatDayAndTime, formatPrice, getParam } from "../format.js";

await mountLayout({ area: "kunde", active: "" });

const showingId = Number(getParam("showing"));

const state = {
    step: 1,
    showing: null,        // forestillingen fra backenden
    seats: [],            // alle sæder i salen: { seatId, row, seatNumber, booked }
    selected: new Set(),  // id'er på de sæder, brugeren har valgt
    ticketTypes: [],      // fx Voksen, Barn, Pensionist
    quantities: {},       // antal billetter af hver type ud over den første: { typeId: antal }
    customer: null,       // kunden, hvis man er logget ind
};

const head = document.getElementById("bookingHead");
const body = document.getElementById("bookingBody");
const seatmap = document.getElementById("seatmap");
const summary = document.getElementById("summary");
const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");

try {
    // Fire kald på én gang: forestilling, sæder, billettyper og hvem der er logget ind
    const [showing, seatMap, ticketTypes, customer] = await Promise.all([
        api("/api/showings/" + showingId),
        api("/api/showings/" + showingId + "/seats"),
        api("/api/ticket-types"),
        getCustomer(),
    ]);
    state.showing = showing;
    state.seats = seatMap.seats;
    state.ticketTypes = ticketTypes;
    state.customer = customer;
    start();
} catch (error) {
    head.replaceChildren(el("h1", {}, "Forestillingen blev ikke fundet"), emptyState(error.message));
    document.getElementById("steps").hidden = true;
}

function start() {
    const showing = state.showing;
    document.title = "Bestil: " + showing.movieName + " | Kino";
    head.replaceChildren(
        el("h1", {}, showing.movieName),
        el("p", { class: "lead" }, formatDayAndTime(showing.startTime) + ", " + showing.auditoriumName),
    );

    // Forestillinger, der ikke kan bookes, stopper her med en forklaring
    let blocked = "";
    if (showing.status === "CANCELLED") blocked = "Forestillingen er aflyst.";
    else if (new Date(showing.startTime) < new Date()) blocked = "Forestillingen er allerede startet.";
    else if (showing.availableSeats === 0) blocked = "Forestillingen er udsolgt.";
    else if (state.ticketTypes.length === 0) blocked = "Der er ikke oprettet nogen billettyper endnu.";
    if (blocked) {
        document.getElementById("steps").hidden = true;
        head.append(emptyState(blocked), el("a", { class: "btn btn-primary mt-4", href: "program.html" }, "Se programmet"));
        return;
    }

    body.hidden = false;
    drawSeatmap();
    setupGuestForm();
    render();

    // Hent optagne sæder igen med jævne mellemrum, så man ser andres bookinger
    setInterval(refreshSeats, SEAT_REFRESH_MS);
}

// ---------- Sædekortet ----------

function drawSeatmap() {
    // Sæderne kommer sorteret efter række og nummer. Her samles de række for række
    const rows = new Map();
    for (const seat of state.seats) {
        if (!rows.has(seat.row)) rows.set(seat.row, []);
        rows.get(seat.row).push(seat);
    }
    seatmap.replaceChildren();
    let first = true;
    for (const [rowNumber, seats] of rows) {
        const rowElement = el("div", { class: "kino-seatrow" }, el("span", { class: "kino-rowlabel", "aria-hidden": "true" }, rowNumber));
        for (const seat of seats) {
            const button = el("button", {
                type: "button",
                class: "kino-seat",
                id: "seat-" + seat.seatId,
                "data-row": seat.row,
                "data-number": seat.seatNumber,
                // Kun ét sæde ad gangen kan nås med Tab. Resten nås med piletasterne (roving tabindex)
                tabindex: first ? "0" : "-1",
            });
            first = false;
            button.addEventListener("click", () => toggleSeat(seat.seatId));
            rowElement.append(button);
        }
        rowElement.append(el("span", { class: "kino-rowlabel", "aria-hidden": "true" }, rowNumber));
        seatmap.append(rowElement);
    }
    seatmap.addEventListener("keydown", moveWithArrows);
    paintSeats();
}

// Opdaterer udseende og skærmlæser-tekst for hvert sæde ud fra state
function paintSeats() {
    for (const seat of state.seats) {
        const button = document.getElementById("seat-" + seat.seatId);
        const selected = state.selected.has(seat.seatId);
        button.classList.toggle("is-booked", seat.booked);
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-disabled", String(seat.booked));
        button.setAttribute("aria-pressed", String(selected));
        const status = seat.booked ? "optaget" : selected ? "valgt" : "ledig";
        button.setAttribute("aria-label", "Række " + seat.row + ", sæde " + seat.seatNumber + ", " + status);
    }
}

function toggleSeat(seatId) {
    const seat = state.seats.find(candidate => candidate.seatId === seatId);
    if (seat.booked) return;
    if (state.selected.has(seatId)) state.selected.delete(seatId);
    else state.selected.add(seatId);
    fitQuantities();
    paintSeats();
    render();
}

// Piletasterne flytter fokus mellem sæderne
function moveWithArrows(event) {
    const button = event.target.closest(".kino-seat");
    if (!button) return;
    let row = Number(button.dataset.row);
    let number = Number(button.dataset.number);
    if (event.key === "ArrowLeft") number--;
    else if (event.key === "ArrowRight") number++;
    else if (event.key === "ArrowUp") row--;
    else if (event.key === "ArrowDown") row++;
    else return;
    event.preventDefault();
    const target = seatmap.querySelector('.kino-seat[data-row="' + row + '"][data-number="' + number + '"]');
    if (target) {
        button.tabIndex = -1;
        target.tabIndex = 0;
        target.focus();
    }
}

async function refreshSeats() {
    try {
        const seatMap = await api("/api/showings/" + showingId + "/seats");
        state.seats = seatMap.seats;
        // Er et af de valgte sæder blevet booket af en anden i mellemtiden, fjernes det fra valget
        let lost = 0;
        for (const seat of state.seats) {
            if (seat.booked && state.selected.has(seat.seatId)) {
                state.selected.delete(seat.seatId);
                lost++;
            }
        }
        if (lost > 0) {
            showToast(lost === 1 ? "Et af dine sæder blev lige booket af en anden." : lost + " af dine sæder blev lige booket af andre.", "error");
            fitQuantities();
            if (state.selected.size === 0) state.step = 1;
        }
        paintSeats();
        render();
    } catch (error) {
        // Et enkelt mislykket opslag er ikke værd at forstyrre brugeren med. Næste forsøg kommer om lidt
    }
}

// ---------- Billettyper og pris ----------
// Alle billetter er som udgangspunkt den første type (Voksen). Brugeren skriver, hvor mange af dem
// der i stedet skal være Barn, Pensionist osv.

function otherTypes() {
    return state.ticketTypes.slice(1);
}

// Sørger for, at der aldrig er valgt flere særbilletter, end der er sæder
function fitQuantities() {
    let room = state.selected.size;
    for (const type of otherTypes()) {
        const wanted = state.quantities[type.id] || 0;
        const allowed = Math.min(wanted, room);
        state.quantities[type.id] = allowed;
        room -= allowed;
    }
}

// Antal billetter pr. type, fx [{ type: Voksen, count: 2 }, { type: Barn, count: 1 }]
function ticketCounts() {
    let rest = state.selected.size;
    const counts = [];
    for (const type of otherTypes()) {
        const count = state.quantities[type.id] || 0;
        rest -= count;
        counts.push({ type, count });
    }
    counts.unshift({ type: state.ticketTypes[0], count: rest });
    return counts;
}

function totalPrice() {
    return ticketCounts().reduce((sum, entry) => sum + entry.count * entry.type.price, 0);
}

// De valgte sæder i rækkefølge, fx "3-5"
function selectedSeats() {
    return state.seats.filter(seat => state.selected.has(seat.seatId));
}

// ---------- Resumé og trin ----------

// Felterne til billettyper bliver tegnet igen, hver gang render kører. Forlader et felt siden, mens der
// står en ny værdi i det, fyrer det en "change"-hændelse, som også kalder render. De to variabler sørger for,
// at render så kører færdig først og derefter én gang til, i stedet for at køre inde i sig selv.
let rendering = false;
let renderAgain = false;

function render() {
    if (rendering) {
        renderAgain = true;
        return;
    }
    rendering = true;
    try {
        draw();
    } finally {
        rendering = false;
    }
    if (renderAgain) {
        renderAgain = false;
        render();
    }
}

function draw() {
    // Trin-indikatoren
    for (const item of document.querySelectorAll("#steps li")) {
        const step = Number(item.dataset.step);
        item.classList.toggle("is-current", step === state.step);
        item.classList.toggle("is-done", step < state.step);
        if (step === state.step) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
    }
    document.getElementById("step1").hidden = state.step !== 1;
    document.getElementById("step2").hidden = state.step !== 2;
    document.getElementById("step3").hidden = state.step !== 3;

    const seats = selectedSeats();
    const parts = [];

    parts.push(el("dl", {}, [
        el("dt", {}, "Sæder"),
        el("dd", {}, seats.length === 0 ? "Ingen valgt" : seats.map(seat => "Række " + seat.row + ", sæde " + seat.seatNumber).join("; ")),
    ]));

    if (seats.length > 0) {
        if (state.step === 1 && otherTypes().length > 0) {
            // Felter til at vælge, hvor mange billetter der er Barn, Pensionist osv.
            const fields = el("div", { class: "mt-3" }, el("div", { class: "form-label" }, "Billetter"));
            fields.append(el("p", { class: "form-text mt-0" },
                "Alle billetter er " + state.ticketTypes[0].ticketName + " (" + formatPrice(state.ticketTypes[0].price) + "), medmindre du vælger andet."));
            for (const type of otherTypes()) {
                const input = el("input", {
                    class: "form-control form-control-sm",
                    type: "number",
                    min: "0",
                    max: String(seats.length),
                    value: String(state.quantities[type.id] || 0),
                    id: "qty-" + type.id,
                });
                input.addEventListener("change", () => {
                    state.quantities[type.id] = Math.max(0, Math.floor(Number(input.value) || 0));
                    fitQuantities();
                    render();
                });
                fields.append(el("div", { class: "kino-qty" }, [
                    el("label", { for: "qty-" + type.id }, type.ticketName + " (" + formatPrice(type.price) + ")"),
                    input,
                ]));
            }
            parts.push(fields);
        }

        const lines = el("dl", { class: "mt-3" });
        for (const entry of ticketCounts()) {
            if (entry.count > 0) {
                lines.append(
                    el("dt", {}, entry.count + " × " + entry.type.ticketName),
                    el("dd", {}, formatPrice(entry.count * entry.type.price)),
                );
            }
        }
        parts.push(lines);
        parts.push(el("div", { class: "kino-total" }, [el("span", {}, "I alt"), el("strong", {}, formatPrice(totalPrice()))]));
    } else {
        parts.push(el("p", { class: "text-secondary mt-3 mb-0" }, "Klik på de sæder, du vil have."));
    }
    summary.replaceChildren(...parts);

    // Knapperne
    backBtn.hidden = state.step === 1;
    nextBtn.disabled = seats.length === 0;
    nextBtn.textContent = state.step === 3 ? "Bekræft booking" : "Fortsæt";

    if (state.step === 2) renderCustomerInfo();
    if (state.step === 3) renderConfirm();
}

function setupGuestForm() {
    // Efter login kommer man tilbage til denne forestilling
    document.getElementById("loginLink").href = "konto.html?next=" + encodeURIComponent("booking.html?showing=" + showingId);
}

function renderCustomerInfo() {
    const info = document.getElementById("customerInfo");
    const form = document.getElementById("guestForm");
    if (state.customer) {
        form.hidden = true;
        info.replaceChildren(el("p", { class: "mb-0" },
            "Du er logget ind som " + state.customer.name + " (" + state.customer.email + "). Billetten gemmes under Mine bookinger."));
    } else {
        form.hidden = false;
        info.replaceChildren();
    }
}

function renderConfirm() {
    const name = state.customer ? state.customer.name : document.getElementById("guestName").value.trim();
    const email = state.customer ? state.customer.email : document.getElementById("guestMail").value.trim();
    document.getElementById("confirmInfo").replaceChildren(
        el("dl", { class: "row mb-0" }, [
            el("dt", { class: "col-3" }, "Film"), el("dd", { class: "col-9" }, state.showing.movieName),
            el("dt", { class: "col-3" }, "Tid"), el("dd", { class: "col-9" }, formatDayAndTime(state.showing.startTime)),
            el("dt", { class: "col-3" }, "Sal"), el("dd", { class: "col-9" }, state.showing.auditoriumName),
            el("dt", { class: "col-3" }, "Navn"), el("dd", { class: "col-9" }, name),
            el("dt", { class: "col-3" }, "Email"), el("dd", { class: "col-9" }, email),
        ]),
        el("p", { class: "text-secondary mt-3 mb-0" }, "Du betaler i biografen, når du henter dine billetter."),
    );
}

// ---------- Frem og tilbage ----------

backBtn.addEventListener("click", () => {
    state.step--;
    render();
});

nextBtn.addEventListener("click", async () => {
    if (state.step === 1) {
        state.step = 2;
        render();
    } else if (state.step === 2) {
        // Gæster skal udfylde navn og email. checkValidity bruger reglerne i HTML'en (required, type="email")
        const form = document.getElementById("guestForm");
        if (!state.customer && !form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }
        state.step = 3;
        render();
    } else {
        await submitBooking();
    }
});

async function submitBooking() {
    // Fordel billettyperne på sæderne: først særbilletterne, resten får den første type
    const typeIds = [];
    for (const entry of ticketCounts()) {
        for (let i = 0; i < entry.count; i++) typeIds.push(entry.type.id);
    }
    const seats = selectedSeats().map((seat, index) => ({ seatId: seat.seatId, ticketTypeId: typeIds[index] }));

    const request = {
        userId: state.customer ? state.customer.id : null,
        guestName: state.customer ? null : document.getElementById("guestName").value.trim(),
        guestMail: state.customer ? null : document.getElementById("guestMail").value.trim(),
        showingId: showingId,
        seats: seats,
    };

    nextBtn.disabled = true;   // så man ikke kan sende bestillingen to gange
    try {
        const booking = await api("/api/bookings/reserve", { method: "POST", body: request });
        window.location.href = "bekraeftelse.html?id=" + booking.bookingId;
    } catch (error) {
        showError(error);
        if (error.status === 409) {
            // 409 = et sæde blev taget af en anden. Tilbage til sædekortet med friske data
            state.step = 1;
            await refreshSeats();
        }
        render();
    }
}
