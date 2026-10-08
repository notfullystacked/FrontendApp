// Ét sted, hvor alle kald til backenden går igennem.
// Siderne kalder fx  await api("/api/movies")  eller  await api("/api/movies", { method: "POST", body: film })
import { API_BASE } from "./config.js";

// Fejl fra backenden. status er HTTP-koden (400, 401, 404 ...), message er backendens egen besked
export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

// En side kan bestemme, hvad der skal ske ved 401 (ikke logget ind), fx at sende brugeren til login.
// Personalesiderne sætter den i staff.js
let unauthorizedHandler = null;
export function onUnauthorized(handler) {
    unauthorizedHandler = handler;
}

export async function api(path, { method = "GET", body } = {}) {
    let response;
    try {
        response = await fetch(API_BASE + path, {
            method,
            // Sender session-cookien med, så backenden ved, hvem der er logget ind
            credentials: "include",
            headers: body !== undefined ? { "Content-Type": "application/json" } : {},
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch (networkError) {
        // fetch kaster kun en fejl, når serveren slet ikke kan nås (eller CORS blokerer kaldet)
        throw new ApiError(0, "Kan ikke få forbindelse til serveren. Tjek, at backenden kører på port 8080.");
    }

    // 204 No Content: kaldet lykkedes, men der er ikke noget svar at læse (fx efter sletning)
    if (response.status === 204) {
        return null;
    }

    // Læs svaret som tekst først: et tomt svar kan ikke læses med response.json()
    const text = await response.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch (parseError) {
        data = null;
    }

    if (!response.ok) {
        // Backenden svarer altid med {"error": "besked"} ved fejl
        const message = data && data.error ? data.error : "Noget gik galt (fejl " + response.status + ").";
        if (response.status === 401 && unauthorizedHandler) {
            unauthorizedHandler();
        }
        throw new ApiError(response.status, message);
    }
    return data;
}
