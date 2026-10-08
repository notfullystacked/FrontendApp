// Log ind eller opret konto som kunde.
import { api } from "../api.js";
import { mountLayout, showError, showToast } from "../ui.js";
import { getParam } from "../format.js";

await mountLayout({ area: "kunde", active: "konto" });

// Kommer man fra en anden side (fx bookingen), sendes man tilbage dertil bagefter.
// Kun sider i dette projekt er tilladt, så et link udefra ikke kan sende brugeren et fremmed sted hen
function goOn() {
    const next = getParam("next");
    const isOwnPage = next && /^[a-z-]+\.html(\?.*)?$/.test(next);
    window.location.href = isOwnPage ? next : "mine-bookinger.html";
}

const loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", async event => {
    event.preventDefault();   // siden må ikke genindlæses, vi sender selv med fetch
    if (!loginForm.checkValidity()) {
        loginForm.classList.add("was-validated");
        return;
    }
    try {
        await api("/api/users/login", {
            method: "POST",
            body: {
                email: document.getElementById("loginEmail").value.trim(),
                password: document.getElementById("loginPassword").value,
            },
        });
        goOn();
    } catch (error) {
        showError(error.status === 401 ? new Error("Forkert email eller adgangskode.") : error);
    }
});

const registerForm = document.getElementById("registerForm");
registerForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!registerForm.checkValidity()) {
        registerForm.classList.add("was-validated");
        return;
    }
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    try {
        await api("/api/users/register", {
            method: "POST",
            body: {
                name: document.getElementById("regName").value.trim(),
                email: email,
                password: password,
                birthday: document.getElementById("regBirthday").value || null,
            },
        });
        // Efter oprettelsen logges man ind med det samme
        await api("/api/users/login", { method: "POST", body: { email, password } });
        showToast("Kontoen er oprettet");
        goOn();
    } catch (error) {
        showError(error.status === 409 ? new Error("Der findes allerede en konto med den email.") : error);
    }
});
