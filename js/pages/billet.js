// Billetten med QR-kode: billet.html?id=7
import { api } from "../api.js";
import { mountLayout, emptyState } from "../ui.js";
import { el, formatDay, formatTime, formatPrice, getParam } from "../format.js";

await mountLayout({ area: "kunde", active: "" });

const container = document.getElementById("ticket");
const bookingId = getParam("id");

try {
    // /ticket har QR-koden. /bookings/{id} har, om der er betalt, og om forestillingen er aflyst
    const [ticket, booking] = await Promise.all([
        api("/api/bookings/" + bookingId + "/ticket"),
        api("/api/bookings/" + bookingId),
    ]);
    document.title = "Billet " + ticket.bookingId + " | Kino";

    let pill;
    if (booking.showingStatus === "CANCELLED") pill = el("span", { class: "kino-pill kino-pill-bad" }, "Forestillingen er aflyst");
    else if (booking.checkedIn) pill = el("span", { class: "kino-pill kino-pill-ok" }, "Brugt");
    else if (booking.paid) pill = el("span", { class: "kino-pill kino-pill-ok" }, "Betalt");
    else pill = el("span", { class: "kino-pill kino-pill-wait" }, "Betales i biografen");

    container.replaceChildren(
        el("article", { class: "kino-ticket" }, [
            el("div", { class: "kino-ticket-main" }, [
                pill,
                el("h1", {}, ticket.movieTitle),
                el("dl", {}, [
                    el("div", {}, [el("dt", {}, "Dato"), el("dd", { class: "kino-capital" }, formatDay(ticket.showingStart))]),
                    el("div", {}, [el("dt", {}, "Klokken"), el("dd", {}, formatTime(ticket.showingStart))]),
                    el("div", {}, [el("dt", {}, "Sal"), el("dd", {}, ticket.auditoriumName)]),
                    el("div", {}, [el("dt", {}, "Pris i alt"), el("dd", {}, formatPrice(ticket.totalPrice))]),
                    el("div", {}, [el("dt", {}, "Sæder"), el("dd", {}, ticket.seats.map(seatText).join(", "))]),
                    el("div", {}, [el("dt", {}, "Navn"), el("dd", {}, ticket.customerName)]),
                ]),
            ]),
            el("div", { class: "kino-ticket-stub" }, [
                // Backenden sender QR-koden som et PNG-billede kodet i Base64.
                // "data:image/png;base64," foran teksten gør, at browseren kan vise den som et billede
                el("img", { class: "kino-ticket-qr", src: "data:image/png;base64," + ticket.qrCode, alt: "QR-kode til billetkontrollen" }),
                el("div", { class: "kino-ticket-number" }, "Nr. " + ticket.bookingId),
            ]),
        ]),
        el("p", { class: "text-center text-secondary mt-4" }, "Vis billetten ved indgangen."),
    );
} catch (error) {
    container.replaceChildren(el("h1", {}, "Billetten blev ikke fundet"), emptyState(error.message));
}

function seatText(seat) {
    const [row, number] = seat.seatCode.split("-");
    return "Række " + row + ", sæde " + number;
}
