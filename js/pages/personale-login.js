// Login for medarbejdere.
import { api } from "../api.js";
import { mountLayout, showError } from "../ui.js";
import { getParam } from "../format.js";

await mountLayout({ area: "kunde", active: "" });

// Er man allerede logget ind, går man direkte videre
try {
    await api("/api/auth/me");
    goOn();
} catch (error) {
    // 401 er det forventede svar her: ingen er logget ind, så formularen vises
}

function goOn() {
    const next = getParam("next");
    const isOwnPage = next && /^[a-z-]+\.html(\?.*)?$/.test(next);
    window.location.href = isOwnPage ? next : "index.html";
}

const form = document.getElementById("loginForm");
form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
    }
    try {
        await api("/api/auth/login", {
            method: "POST",
            body: {
                username: document.getElementById("username").value.trim(),
                password: document.getElementById("password").value,
            },
        });
        goOn();
    } catch (error) {
        showError(error);   // backenden svarer "Forkert brugernavn eller adgangskode"
    }
});
