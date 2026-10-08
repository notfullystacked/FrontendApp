// Bekræftelsen efter en booking: bekraeftelse.html?id=7
import { api } from "../api.js";
import { mountLayout, emptyState } from "../ui.js";
import { el, icon, formatDayAndTime, formatPrice, getParam } from "../format.js";

await mountLayout({ area: "kunde", active: "" });

const container = document.getElementById("confirmation");
const bookingId = getParam("id");

try {
    const booking = await api("/api/bookings/" + bookingId);
    container.replaceChildren(
        el("h1", {}, "Din booking er gennemført"),
        el("p", { class: "lead mb-4" }, "Gem dit booking-nummer. Du skal bruge det, når du henter dine billetter."),
        el("div", { class: "kino-panel", style: "max-width: 720px" }, [
            el("dl", { class: "row mb-0" }, [
                el("dt", { class: "col-4" }, "Booking-nummer"), el("dd", { class: "col-8 fs-4 kino-heading" }, String(booking.bookingId)),
                el("dt", { class: "col-4" }, "Film"), el("dd", { class: "col-8" }, booking.movieName),
                el("dt", { class: "col-4" }, "Tid"), el("dd", { class: "col-8" }, formatDayAndTime(booking.startTime)),
                el("dt", { class: "col-4" }, "Sal"), el("dd", { class: "col-8" }, booking.auditoriumName),
                el("dt", { class: "col-4" }, "Sæder"), el("dd", { class: "col-8" }, booking.seats.map(seatText).join("; ")),
                el("dt", { class: "col-4" }, "Navn"), el("dd", { class: "col-8" }, booking.customerName),
                el("dt", { class: "col-4" }, "Pris i alt"), el("dd", { class: "col-8" }, formatPrice(booking.totalPrice)),
            ]),
            el("p", { class: "text-secondary mt-3" }, booking.paid ? "Bookingen er betalt." : "Du betaler i biografen, når du henter dine billetter."),
            el("a", { class: "btn btn-primary", href: "billet.html?id=" + booking.bookingId }, [icon("qr-code"), " Vis billet"]),
        ]),
    );
} catch (error) {
    container.replaceChildren(el("h1", {}, "Bookingen blev ikke fundet"), emptyState(error.message));
}

// Sædekoden fra backenden er "række-sæde", fx "3-12"
function seatText(seat) {
    const [row, number] = seat.seatCode.split("-");
    return "Række " + row + ", sæde " + number + " (" + seat.ticketTypeName + ")";
}
