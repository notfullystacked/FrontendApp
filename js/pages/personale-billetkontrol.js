// Billetkontrol: find en booking på nummeret, og tjek den ind.
import { api } from "../api.js";
import { startStaffPage } from "../staff.js";
import { showToast, showError, emptyState } from "../ui.js";
import { el, formatDayAndTime } from "../format.js";

const employee = await startStaffPage("billetkontrol");

const form = document.getElementById("lookupForm");
const result = document.getElementById("result");

if (employee) {
    form.addEventListener("submit", event => {
        event.preventDefault();
        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }
        lookup();
    });
}

// QR-koden indeholder "TICKET-12". Her findes tallet, uanset om der er skrevet "12" eller "TICKET-12"
function bookingIdFromInput() {
    const digits = document.getElementById("bookingNumber").value.replace(/\D/g, "");
    return digits === "" ? null : Number(digits);
}

async function lookup() {
    const bookingId = bookingIdFromInput();
    if (bookingId === null) {
        result.replaceChildren(emptyState("Booking-nummeret skal indeholde et tal."));
        return;
    }
    try {
        show(await api("/api/bookings/" + bookingId));
    } catch (error) {
        result.replaceChildren(emptyState(error.message));
    }
}

function show(booking) {
    const cancelled = booking.showingStatus === "CANCELLED";
    let status;
    let canCheckIn = false;
    if (cancelled) status = el("span", { class: "kino-pill kino-pill-bad" }, "Forestillingen er aflyst");
    else if (booking.checkedIn) status = el("span", { class: "kino-pill kino-pill-bad" }, "Billetten er allerede brugt");
    else if (!booking.paid) status = el("span", { class: "kino-pill kino-pill-wait" }, "Ikke betalt");
    else {
        status = el("span", { class: "kino-pill kino-pill-ok" }, "Betalt og klar");
        canCheckIn = true;
    }

    result.replaceChildren(el("div", { class: "kino-panel" }, [
        el("div", { class: "d-flex justify-content-between align-items-start mb-3" }, [
            el("h2", { class: "mb-0" }, "Booking " + booking.bookingId),
            status,
        ]),
        el("dl", { class: "row mb-0" }, [
            el("dt", { class: "col-3" }, "Film"), el("dd", { class: "col-9" }, booking.movieName),
            el("dt", { class: "col-3" }, "Tid"), el("dd", { class: "col-9" }, formatDayAndTime(booking.startTime)),
            el("dt", { class: "col-3" }, "Sal"), el("dd", { class: "col-9" }, booking.auditoriumName),
            el("dt", { class: "col-3" }, "Sæder"), el("dd", { class: "col-9" }, booking.seats.map(seat => seat.seatCode).join(", ")),
            el("dt", { class: "col-3" }, "Kunde"), el("dd", { class: "col-9" }, booking.customerName),
        ]),
        canCheckIn
            ? el("button", { class: "btn btn-primary btn-lg mt-4", type: "button", onclick: () => checkIn(booking) }, "Tjek ind")
            : null,
    ]));
}

async function checkIn(booking) {
    try {
        const updated = await api("/api/bookings/" + booking.bookingId + "/check-in", { method: "PUT" });
        showToast("Booking " + booking.bookingId + " er tjekket ind");
        show(updated);
        document.getElementById("bookingNumber").value = "";
        document.getElementById("bookingNumber").focus();
    } catch (error) {
        showError(error);
    }
}
