// Fælles dele af brugerfladen: menu, sidefod, beskeder (toasts), bekræft-dialog, plakater og filmkort.
// Hver side kalder mountLayout(...) én gang, så menu og sidefod kun er skrevet ét sted.
import { api } from "./api.js";
import { el, icon, genreName, statusName, formatRunTime, formatRating } from "./format.js";

// Sider i undermappen personale/ sætter <body data-root="../">, så links peger rigtigt
const ROOT = document.body.dataset.root || "";

// ---------- Logo ----------

// Kino-logoet: et stykke filmstrimmel tegnet som SVG, og navnet ved siden af
function logo() {
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("viewBox", "0 0 40 32");
    svg.setAttribute("class", "kino-logo-mark");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
        '<rect x="1" y="1" width="38" height="30" rx="6" fill="var(--kino-red)"/>' +
        '<g fill="var(--kino-bg)">' +
        '<rect x="5" y="5" width="4" height="4" rx="1"/><rect x="5" y="14" width="4" height="4" rx="1"/><rect x="5" y="23" width="4" height="4" rx="1"/>' +
        '<rect x="31" y="5" width="4" height="4" rx="1"/><rect x="31" y="14" width="4" height="4" rx="1"/><rect x="31" y="23" width="4" height="4" rx="1"/>' +
        "</g>" +
        '<path d="M16 9.5v13l10-6.5z" fill="var(--kino-gold)"/>';
    return el("span", { class: "kino-logo" }, [svg, el("span", { class: "kino-logo-text" }, "Kino")]);
}

// ---------- Menu og sidefod ----------

// Den kunde, der er logget ind, eller null. Backenden svarer 401, når ingen er logget ind
export async function getCustomer() {
    try {
        return await api("/api/users/profile");
    } catch (error) {
        return null;
    }
}

function navLink(href, text, iconName, active) {
    return el("li", { class: "nav-item" }, el("a", {
        class: "nav-link" + (active ? " active" : ""),
        href: ROOT + href,
        "aria-current": active ? "page" : null,
    }, [icon(iconName), " " + text]));
}

// Menuen for kunder. active er navnet på den side, der er åben (fx "program")
async function customerNav(active) {
    const left = el("ul", { class: "navbar-nav me-auto" }, [
        navLink("index.html", "Forside", "house-door", active === "forside"),
        navLink("program.html", "Program", "calendar-event", active === "program"),
        navLink("sale.html", "Salene", "grid-3x3-gap", active === "sale"),
    ]);
    const right = el("ul", { class: "navbar-nav align-items-center" });

    const customer = await getCustomer();
    if (customer) {
        right.append(
            navLink("mine-bookinger.html", "Mine bookinger", "ticket-perforated", active === "mine-bookinger"),
            el("li", { class: "nav-item" }, el("span", { class: "navbar-text ms-3" }, customer.name)),
            el("li", { class: "nav-item ms-2" }, el("button", {
                class: "btn btn-sm btn-outline-light",
                type: "button",
                onclick: async () => {
                    await api("/api/users/logout", { method: "POST" });
                    window.location.href = ROOT + "index.html";
                },
            }, "Log ud")),
        );
    } else {
        right.append(navLink("konto.html", "Log ind", "person", active === "konto"));
    }
    return [left, right];
}

// Menupunkterne for personalet og hvilke roller der må se dem. Tom liste = alle medarbejdere.
// Rollenavnene er de samme som i backenden (RoleGuard). Admin må altid alt
export const STAFF_PAGES = [
    { key: "oversigt", href: "personale/index.html", text: "Oversigt", icon: "speedometer2", roles: [] },
    { key: "film", href: "personale/film.html", text: "Film", icon: "film", roles: ["MovieEditor"] },
    { key: "forestillinger", href: "personale/forestillinger.html", text: "Forestillinger", icon: "calendar-week", roles: ["MovieEditor"] },
    { key: "bookinger", href: "personale/bookinger.html", text: "Bookinger", icon: "search", roles: [] },
    { key: "billetkontrol", href: "personale/billetkontrol.html", text: "Billetkontrol", icon: "qr-code-scan", roles: ["Inspector", "Clerk"] },
    { key: "sale", href: "personale/sale.html", text: "Rengøring", icon: "stars", roles: ["Inspector", "Clerk"] },
    { key: "medarbejdere", href: "personale/medarbejdere.html", text: "Medarbejdere", icon: "people", roles: ["Admin"] },
    { key: "priser", href: "personale/priser.html", text: "Priser", icon: "tag", roles: ["Admin"] },
];

export function mayUse(employee, roles) {
    if (roles.length === 0 || employee.roles.includes("Admin")) return true;
    return roles.some(role => employee.roles.includes(role));
}

function staffNav(active, employee) {
    const left = el("ul", { class: "navbar-nav me-auto" });
    for (const page of STAFF_PAGES) {
        // Vis kun de sider, medarbejderens rolle må bruge
        if (mayUse(employee, page.roles)) {
            left.append(navLink(page.href, page.text, page.icon, active === page.key));
        }
    }
    const right = el("ul", { class: "navbar-nav align-items-center" }, [
        el("li", { class: "nav-item" }, el("span", { class: "navbar-text", title: "Roller: " + employee.roles.join(", ") }, employee.name)),
        el("li", { class: "nav-item ms-3" }, el("button", {
            class: "btn btn-sm btn-outline-light",
            type: "button",
            onclick: async () => {
                await api("/api/auth/logout", { method: "POST" });
                window.location.href = ROOT + "personale/login.html";
            },
        }, "Log ud")),
    ]);
    return [left, right];
}

function footer() {
    return el("footer", { class: "kino-footer" }, el("div", { class: "container d-flex justify-content-between align-items-start gap-4" }, [
        el("div", {}, [
            logo(),
            el("p", { class: "mt-2 mb-0" }, "Den lokale biograf med to sale."),
        ]),
        el("div", {}, [
            el("div", { class: "kino-footer-title" }, "Åbningstider"),
            el("p", { class: "mb-0" }, "Alle dage fra kl. 15.00 til sidste forestilling er slut."),
        ]),
        el("div", {}, [
            el("div", { class: "kino-footer-title" }, "Billetsalg"),
            el("p", { class: "mb-0" }, "Bestil her på siden, eller ring på 12 34 56 78."),
        ]),
        el("div", {}, [
            el("div", { class: "kino-footer-title" }, "Personale"),
            el("a", { href: ROOT + "personale/login.html" }, "Log ind som medarbejder"),
        ]),
    ]));
}

// Sætter menu, sidefod, besked-område og bekræft-dialog ind på siden.
//   mountLayout({ area: "kunde", active: "program" })
//   mountLayout({ area: "personale", active: "film", employee })
export async function mountLayout({ area, active, employee = null }) {
    const lists = area === "personale" && employee ? staffNav(active, employee) : await customerNav(active);

    const nav = el("nav", {
        class: "navbar navbar-expand navbar-dark kino-navbar sticky-top" + (area === "personale" ? " kino-navbar-staff" : ""),
        "aria-label": "Hovedmenu",
    },
        el("div", { class: "container" }, [
            el("a", { class: "navbar-brand", href: ROOT + (area === "personale" ? "personale/index.html" : "index.html") }, [
                logo(),
                area === "personale" ? el("span", { class: "kino-staff-tag" }, "Personale") : null,
            ]),
            ...lists,
        ]));

    document.body.prepend(nav);
    document.body.append(
        footer(),
        el("div", { class: "toast-container position-fixed bottom-0 end-0 p-3", id: "toasts", "aria-live": "polite" }),
    );
}

// ---------- Beskeder i hjørnet (toasts) ----------

// showToast("Film gemt")  eller  showToast("Sædet er optaget", "error")
export function showToast(message, type = "success") {
    const toast = el("div", {
        class: "toast kino-toast kino-toast-" + type,
        role: type === "error" ? "alert" : "status",
    }, el("div", { class: "d-flex" }, [
        el("div", { class: "toast-body" }, [icon(type === "error" ? "exclamation-triangle" : "check-circle"), " " + message]),
        el("button", { type: "button", class: "btn-close btn-close-white me-2 m-auto", "data-bs-dismiss": "toast", "aria-label": "Luk" }),
    ]));
    document.getElementById("toasts").append(toast);
    // bootstrap er den globale variabel fra bootstrap.bundle.min.js
    const instance = new bootstrap.Toast(toast, { delay: type === "error" ? 7000 : 3500 });
    toast.addEventListener("hidden.bs.toast", () => toast.remove());
    instance.show();
}

// Viser backendens fejlbesked som en toast. Bruges i catch-blokke
export function showError(error) {
    showToast(error && error.message ? error.message : "Noget gik galt.", "error");
}

// ---------- Bekræft-dialog ----------

// Spørger brugeren, før noget slettes eller aflyses. Returnerer true, hvis der svares ja.
//   if (await confirmDialog("Slet filmen?", "Det kan ikke fortrydes.", "Slet")) { ... }
export function confirmDialog(title, text, confirmLabel = "Ja") {
    return new Promise(resolve => {
        let answer = false;
        const modal = el("div", { class: "modal fade", tabindex: "-1", "aria-labelledby": "confirmTitle" },
            el("div", { class: "modal-dialog modal-dialog-centered" },
                el("div", { class: "modal-content" }, [
                    el("div", { class: "modal-header" }, [
                        el("h2", { class: "modal-title h5", id: "confirmTitle" }, title),
                        el("button", { type: "button", class: "btn-close", "data-bs-dismiss": "modal", "aria-label": "Luk" }),
                    ]),
                    el("div", { class: "modal-body" }, text),
                    el("div", { class: "modal-footer" }, [
                        el("button", { type: "button", class: "btn btn-outline-light", "data-bs-dismiss": "modal" }, "Fortryd"),
                        el("button", {
                            type: "button",
                            class: "btn btn-danger",
                            onclick: () => { answer = true; instance.hide(); },
                        }, confirmLabel),
                    ]),
                ])));
        document.body.append(modal);
        const instance = new bootstrap.Modal(modal);
        modal.addEventListener("hidden.bs.modal", () => {
            modal.remove();
            resolve(answer);
        });
        instance.show();
    });
}

// ---------- Tom liste ----------

export function emptyState(text) {
    return el("p", { class: "kino-empty" }, text);
}

// ---------- Plakater og filmkort ----------

// Laver et tal mellem 0 og 359 ud fra en tekst, så samme film altid får samme farve.
// Tallene 33, 9973 og 137 er bare valgt, så titler, der ligner hinanden, får forskellige farver
export function hueFromText(text) {
    let sum = 7;
    for (const character of text) sum = (sum * 33 + character.codePointAt(0)) % 9973;
    return (sum * 137) % 360;
}

// En plakat. Har filmen et billede (posterUrl), vises det. Ellers tegnes en plakat med titlen.
// alt er tom med vilje: titlen står altid som tekst lige ved siden af
export function poster(movie) {
    const generated = () => el("div", {
        class: "kino-poster kino-poster-generated",
        style: "--poster-hue: " + hueFromText(movie.name || ""),
    }, [
        el("span", { class: "kino-poster-title" }, movie.name),
        movie.director ? el("span", { class: "kino-poster-director" }, movie.director) : null,
    ]);

    if (!movie.posterUrl) return generated();

    const image = el("img", { class: "kino-poster", src: movie.posterUrl, alt: "" });
    // Kan billedet ikke hentes, vises den tegnede plakat i stedet
    image.addEventListener("error", () => image.replaceWith(generated()));
    return image;
}

// Mærkat for aldersgrænse. 0 betyder tilladt for alle
export function ageBadge(ageRestriction) {
    const text = ageRestriction > 0 ? String(ageRestriction) + " år" : "Alle";
    return el("span", { class: "kino-age", title: "Aldersgrænse" }, text);
}

export function statusBadge(status) {
    if (status !== "PREMIERE" && status !== "COMING_SOON") return null;
    return el("span", { class: "kino-status kino-status-" + status.toLowerCase() }, statusName(status));
}

// De små oplysninger under en titel: genre, spilletid, IMDb, instruktør og år
export function movieFacts(movie, { withDirector = false } = {}) {
    const facts = el("ul", { class: "kino-facts" });
    if (movie.genre) facts.append(el("li", {}, [icon("tag"), " " + genreName(movie.genre)]));
    if (movie.runTime > 0) facts.append(el("li", {}, [icon("clock"), " " + formatRunTime(movie.runTime)]));
    if (movie.imdbRating > 0) facts.append(el("li", {}, [icon("star-fill"), " IMDb " + formatRating(movie.imdbRating)]));
    if (withDirector && movie.director) facts.append(el("li", {}, [icon("camera-reels"), " " + movie.director]));
    if (withDirector && movie.releaseYear > 0) facts.append(el("li", {}, [icon("calendar3"), " " + movie.releaseYear]));
    return facts;
}

// Et filmkort til forsiden: plakat, mærkater, titel og oplysninger. Hele kortet er et link til filmsiden
export function movieCard(movie) {
    return el("a", { class: "kino-card", href: ROOT + "film.html?id=" + movie.id }, [
        el("div", { class: "kino-card-poster" }, [
            poster(movie),
            el("div", { class: "kino-card-badges" }, [statusBadge(movie.status), ageBadge(movie.ageRestriction)]),
        ]),
        el("div", { class: "kino-card-body" }, [
            el("h3", { class: "kino-card-title" }, movie.name),
            movieFacts(movie, { withDirector: true }),
        ]),
    ]);
}
