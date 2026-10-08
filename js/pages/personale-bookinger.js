// Bookinger: søg på email eller forestilling, og registrér betaling.
import { api } from "../api.js";
import { startStaffPage } from "../staff.js";
import { showToast, showError, emptyState } from "../ui.js";
import { el, formatDayAndTime, formatShortDay, formatTime, formatPrice } from "../format.js";

const employee = await startStaffPage("bookinger");

const list = document.getElementById("list");
const form = document.getElementById("searchForm");

if (employee) {
    await loadShowingChoices();
    await search();
    form.addEventListener("submit", event => {
        event.preventDefault();
        search();
    });
    document.getElementById("resetBtn").addEventListener("click", () => {
        document.getElementById("email").value = "";
        document.getElementById("showing").value = "";
        search();
    });
}

async function loadShowingChoices() {
    const select = document.getElementById("showing");
    select.append(el("option", { value: "" }, "Alle forestillinger"));
    try {
        for (const showing of await api("/api/showings")) {
            select.append(el("option", { value: showing.id },
                formatShortDay(showing.startTime) + " kl. " + formatTime(showing.startTime) + ": " + showing.movieName));
        }
    } catch (error) {
        showError(error);
    }
}

async function search() {
    const email = document.getElementById("email").value.trim();
    const showingId = document.getElementById("showing").value;
    // Backenden bruger forestillingen, hvis den er valgt, ellers emailen, ellers vises alle
    const params = new URLSearchParams();
    if (showingId) params.set("showingId", showingId);
    else if (email) params.set("email", email);

    try {
        const bookings = await api("/api/bookings?" + params);
        if (bookings.length === 0) {
            list.replaceChildren(emptyState(showingId || email
                ? "Ingen bookinger passer til søgningen."
                : "Der er ingen bookinger endnu."));
            return;
        }
        list.replaceChildren(el("table", { class: "table kino-table" }, [
            el("thead", {}, el("tr", {}, [
                el("th", {}, "Nr."), el("th", {}, "Kunde"), el("th", {}, "Forestilling"), el("th", {}, "Sæder"),
                el("th", {}, "Pris"), el("th", {}, "Status"), el("th", { class: "text-end" }, "Handlinger"),
            ])),
            el("tbody", {}, bookings.map(bookingRow)),
        ]));
    } catch (error) {
        list.replaceChildren(emptyState(error.message));
    }
}

function bookingRow(booking) {
    let status;
    if (booking.showingStatus === "CANCELLED") status = el("span", { class: "kino-pill kino-pill-bad" }, "Forestilling aflyst");
    else if (booking.checkedIn) status = el("span", { class: "kino-pill kino-pill-ok" }, "Tjekket ind");
    else if (booking.paid) status = el("span", { class: "kino-pill kino-pill-ok" }, "Betalt");
    else status = el("span", { class: "kino-pill kino-pill-wait" }, "Ikke betalt");

    return el("tr", {}, [
        el("td", {}, el("strong", {}, String(booking.bookingId))),
        el("td", {}, [booking.customerName, el("div", { class: "kino-showing-meta" }, booking.customerEmail)]),
        el("td", {}, [booking.movieName, el("div", { class: "kino-showing-meta kino-capital" }, formatDayAndTime(booking.startTime))]),
        el("td", {}, booking.seats.map(seat => seat.seatCode).join(", ")),
        el("td", {}, formatPrice(booking.totalPrice)),
        el("td", {}, status),
        el("td", {}, el("div", { class: "kino-actions" }, [
            booking.paid ? null : el("button", { class: "btn btn-sm btn-primary", type: "button", onclick: () => pay(booking) }, "Registrér betaling"),
            el("a", { class: "btn btn-sm btn-outline-light", href: "../billet.html?id=" + booking.bookingId }, "Vis billet"),
        ])),
    ]);
}

async function pay(booking) {
    try {
        await api("/api/bookings/" + booking.bookingId + "/pay", { method: "POST" });
        showToast("Betaling registreret for booking " + booking.bookingId);
        await search();
    } catch (error) {
        showError(error);
    }
}
