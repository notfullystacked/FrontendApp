// Fælles start for alle personalesider: tjek login og rolle, og byg menuen.
import { api, onUnauthorized } from "./api.js";
import { mountLayout, mayUse, STAFF_PAGES } from "./ui.js";
import { el } from "./format.js";

const LOGIN_PAGE = "login.html";

function goToLogin() {
    // next = den side, man kom fra, så man lander samme sted efter login
    const here = window.location.pathname.split("/").pop() + window.location.search;
    window.location.href = LOGIN_PAGE + "?next=" + encodeURIComponent(here);
}

// Kaldes øverst i hver personaleside:
//   const employee = await startStaffPage("film");
// Returnerer medarbejderen, eller null hvis siden ikke må vises (så skal siden bare stoppe).
export async function startStaffPage(key) {
    let employee;
    try {
        employee = await api("/api/auth/me");
    } catch (error) {
        if (error.status === 401) {
            goToLogin();
            return null;
        }
        throw error;
    }

    // Udløber sessionen, mens siden er åben, svarer backenden 401 på næste kald. Så sendes man til login
    onUnauthorized(goToLogin);

    await mountLayout({ area: "personale", active: key, employee });

    const page = STAFF_PAGES.find(candidate => candidate.key === key);
    if (page && !mayUse(employee, page.roles)) {
        const main = document.querySelector("main");
        main.replaceChildren(el("div", { class: "container py-5" }, [
            el("h1", {}, "Ingen adgang"),
            el("p", { class: "lead" }, "Din rolle giver ikke adgang til denne side. Kræver: " + page.roles.join(" eller ") + "."),
        ]));
        return null;
    }
    return employee;
}
