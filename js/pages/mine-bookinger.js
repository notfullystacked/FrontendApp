// En kundes egne bookinger. Kræver, at man er logget ind som kunde.
import { api } from "../api.js";
import { mountLayout, getCustomer, emptyState } from "../ui.js";
import { el, icon, formatDayAndTime, formatPrice } from "../format.js";

await mountLayout({ area: "kunde", active: "mine-bookinger" });

const container = document.getElementById("bookings");
const customer = await getCustomer();

if (!customer) {
    window.location.href = "konto.html?next=mine-bookinger.html";
} else {
    document.getElementById("bookingsLead").textContent = "Bookinger lavet med kontoen " + customer.email + ".";
    try {
        const bookings = await api("/api/users/" + customer.id + "/bookings");
        if (bookings.length === 0) {
            container.replaceChildren(
                emptyState("Du har ingen bookinger endnu."),
                el("a", { class: "btn btn-primary mt-4", href: "program.html" }, "Se programmet"),
            );
        } else {
            container.replaceChildren(...bookings.map(bookingRow));
        }
    } catch (error) {
        container.replaceChildren(emptyState(error.message));
    }
}

function bookingRow(booking) {
    let status;
    if (booking.showingStatus === "CANCELLED") status = el("span", { class: "kino-pill kino-pill-bad" }, "Aflyst");
    else if (booking.checkedIn) status = el("span", { class: "kino-pill kino-pill-ok" }, "Brugt");
    else if (booking.paid) status = el("span", { class: "kino-pill kino-pill-ok" }, "Betalt");
    else status = el("span", { class: "kino-pill kino-pill-wait" }, "Betales i biografen");

    return el("div", { class: "kino-showing" }, [
        el("div", { class: "kino-showing-time" }, "Nr. " + booking.bookingId),
        el("div", {}, [
            el("div", { class: "kino-showing-title" }, booking.movieName),
            el("div", { class: "kino-showing-meta" },
                formatDayAndTime(booking.startTime) + ", " + booking.auditoriumName + ", "
                + booking.seats.length + (booking.seats.length === 1 ? " sæde, " : " sæder, ") + formatPrice(booking.totalPrice)),
        ]),
        status,
        el("a", { class: "btn btn-outline-light", href: "billet.html?id=" + booking.bookingId }, [icon("qr-code"), " Vis billet"]),
    ]);
}
