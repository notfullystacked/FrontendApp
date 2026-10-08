# Kino-frontend: oversigt og forklaring

Denne fil forklarer, hvordan frontenden er bygget, hvilke valg der ligger bag, og hvad du skal kunne
forklare til en underviser eller censor. Den er bygget ud fra gruppens tjekliste fra 8. oktober.

## 1. Teknik

| Valg | Hvorfor |
|---|---|
| Flere HTML-filer, én pr. side | Gruppens valg. Hver side kan læses for sig, og et link er bare et link |
| Ren JavaScript med `fetch` | Ingen frameworks. Alt, der sker, står i koden |
| JavaScript-moduler (`import`/`export`) | Fælles kode ligger ét sted i stedet for at blive kopieret til hver side |
| Bootstrap 5.3 fra CDN | Gitter, knapper, formularer, dialoger og beskeder. Kinos eget udseende ligger i `css/kino.css` |
| Kun computer-skærm | Gruppens valg. `body` har `min-width: 1100px` |

## 2. Mapper og filer

```
index.html, program.html, film.html ...   kundesider
personale/                                 sider for medarbejdere (kræver login)
css/kino.css                               farver, skrifter og Kinos egne dele
js/config.js                               adressen på backenden
js/api.js                                  ét sted, alle kald til backenden går igennem
js/format.js                               datoer, priser, spilletid og el() til at lave HTML-elementer
js/ui.js                                   menu, sidefod, beskeder, bekræft-dialog, plakater, filmkort
js/staff.js                                login- og rolletjek for personalesider
js/pages/                                  ét script pr. side
```

Hver HTML-fil indeholder kun sidens faste struktur og tomme pladser med et `id`. Sidens script henter data
og fylder pladserne ud.

## 3. Sådan virker en side

Eksempel: `program.html`.

1. Browseren henter HTML'en. Nederst står `<script type="module" src="js/pages/program.js">`.
2. `program.js` kalder `mountLayout(...)` fra `ui.js`, som sætter menu og sidefod ind.
3. Scriptet kalder `await api("/api/showings")`. `api()` ligger i `api.js` og bruger `fetch`.
4. Svaret er JSON. Scriptet deler forestillingerne op pr. dag og laver elementerne med `el(...)`.
5. Går noget galt, kaster `api()` en `ApiError` med backendens besked, og siden viser den.

### `api.js`: alle kald ét sted

```js
const film = await api("/api/movies/3");
await api("/api/movies", { method: "POST", body: nyFilm });
```

`api()` gør fire ting, så siderne slipper:

- sætter backendens adresse foran stien,
- sender session-cookien med (`credentials: "include"`), ellers ved backenden ikke, hvem der er logget ind,
- laver objektet om til JSON og sætter `Content-Type`,
- læser fejlen `{"error": "..."}` og kaster den som en `ApiError`.

### `el()`: HTML uden `innerHTML`

```js
el("a", { class: "btn btn-primary", href: "film.html?id=3" }, "Se filmen")
```

Tekst fra backenden sættes med `textContent`, aldrig `innerHTML`. Hvis en filmtitel indeholdt
`<script>...</script>`, ville den blive vist som tekst og ikke kørt. Det beskytter mod XSS.

### Bookingen: tilstand i ét objekt

`booking.js` har ét objekt, `state`, med alt, brugeren har valgt (trin, valgte sæder, antal billetter pr. type).
Hver handling ændrer `state` og kalder `render()`, som tegner resuméet igen ud fra `state`.
Det er samme tankegang som i React, bare skrevet i hånden.

## 4. Siderne

| Side | Fil | Kald til backenden |
|---|---|---|
| Forside | `index.html` | `/api/movies/promoted`, `/premieres`, `/api/showings?date=`, `/api/movies?genre=&search=` |
| Program | `program.html` | `GET /api/showings` |
| Film | `film.html?id=` | `GET /api/movies/{id}`, `/api/movies/{id}/showings` |
| Bestilling | `booking.html?showing=` | `/api/showings/{id}/seats`, `/api/ticket-types`, `POST /api/bookings/reserve` |
| Bekræftelse | `bekraeftelse.html?id=` | `GET /api/bookings/{id}` |
| Billet | `billet.html?id=` | `GET /api/bookings/{id}/ticket` |
| Konto | `konto.html` | `POST /api/users/register`, `/api/users/login` |
| Mine bookinger | `mine-bookinger.html` | `GET /api/users/{id}/bookings` |
| Salene | `sale.html` | `GET /api/auditoriums` |
| Personale: film | `personale/film.html` | `POST/PUT/DELETE /api/movies`, `/promote`, `/deactivate` |
| Personale: forestillinger | `personale/forestillinger.html` | `POST /api/showings`, `PUT .../cancel` |
| Personale: bookinger | `personale/bookinger.html` | `GET /api/bookings`, `POST .../pay` |
| Personale: billetkontrol | `personale/billetkontrol.html` | `PUT /api/bookings/{id}/check-in` |
| Personale: rengøring | `personale/sale.html` | `PUT /api/auditoriums/{id}/clean` og `/needs-cleaning` |
| Personale: medarbejdere | `personale/medarbejdere.html` | `/api/employees` |
| Personale: priser | `personale/priser.html` | `/api/ticket-types` |

## 5. Login og roller

- **Kunder** logger ind på `konto.html`. Menuen spørger `GET /api/users/profile` ved hver sideindlæsning.
  Svarer backenden 401, vises "Log ind". Derfor ser du 401-linjer i browserens konsol, når ingen er logget ind.
  Det er forventet og ikke en fejl.
- **Personale** logger ind på `personale/login.html`. Hver personaleside starter med `startStaffPage("film")`
  fra `staff.js`. Den spørger `GET /api/auth/me`, sender til login ved 401, bygger menuen ud fra rollerne og
  viser "Ingen adgang", hvis rollen mangler.
- Menuen skjuler de sider, rollen ikke må bruge. Det er kun for brugervenlighedens skyld.
  Den rigtige kontrol sker i backenden (`RoleGuard`), for alt i browseren kan ændres af brugeren.

## 6. Valg fra tjeklisten, hvor jeg måtte fortolke

- **Søgning og genre uden "Alle film på programmet".** I sagde ja til søgning og genre-filter, men nej til en
  liste med alle film. Derfor viser forsiden først film, når man søger eller vælger en genre.
- **Billettype uden valg pr. sæde.** Backenden kræver en billettype for hvert sæde. Alle billetter er Voksen,
  og man skriver, hvor mange af dem der i stedet er Barn eller Pensionist. Siden fordeler typerne på sæderne.
- **Sidemenu i personaledelen** var ikke besvaret. Personalet har menuen øverst ligesom kunderne.
- **Plakater.** Ingen film har et plakat-link endnu, så siden tegner selv en plakat med titlen.
  Et rigtigt billede sættes ind ved at rette filmen under Personale og udfylde "Link til plakat".
- **Ingen beskrivende tekst på plakater.** Plakaterne har `alt=""`. Titlen står altid som tekst ved siden af,
  så en skærmlæser læser den ikke to gange.
- **Fravalgt og derfor ikke bygget:** annullering, oprettelse af sale, telefonbooking som egen side,
  "Kommer snart"-sektion, ledige pladser som tal, indlæsnings-indikator, skift mellem lyst og mørkt, mobilvisning.

## 7. Det er afprøvet, og det er ikke

Afprøvet i en rigtig browser mod den kørende backend: forside, søgning, program, filmside, hele bookingen som
gæst og som kunde, billet med QR-kode, opret konto, mine bookinger, personale-login, opret/ret/fremhæv/slet
film, planlæg forestilling (også overlap, som afvises), registrér betaling, billetkontrol, rengøring,
opret medarbejder, ny billettype og rollebegrænset menu.

Ikke afprøvet:

- **Bootstrap, ikoner og skrifter fra nettet.** Testmiljøet havde ikke internet, så siden blev testet med en
  lokal kopi af Bootstrap 5.3.2. Ikonerne (Bootstrap Icons) og skrifterne (Fraunces, Albert Sans) har jeg
  ikke set indlæst. Tjek dem, første gang du åbner siden.
- **Dockerfile og nginx.conf.**

## 8. Kendte begrænsninger

- Alle, der kender et booking-nummer, kan se billetten. Det er en begrænsning i backenden (se dens guide).
- Betaling registreres af personalet. Der er ingen onlinebetaling.
- Datoen på forestillinger er serverens lokale tid. Der er ingen håndtering af tidszoner.
- Backenden bruger en H2-database i hukommelsen, så alle bookinger og ændringer forsvinder, når den genstartes.

## 9. Spørgsmål en censor kunne stille

1. **Hvad er CORS, og hvorfor er det nødvendigt her?** Siden kommer fra port 63342, API'et ligger på 8080.
   Browseren blokerer kald på tværs, medmindre backenden tillader det (`WebConfig` i backenden).
2. **Hvorfor `credentials: "include"`?** Uden den sender `fetch` ikke session-cookien med til en anden port,
   og så er man aldrig logget ind.
3. **Hvad gør `async` og `await`?** `fetch` giver et `Promise`. `await` venter på svaret uden at fryse siden.
4. **Hvorfor `type="module"`?** Så en fil kan `import`ere fra en anden. Uden moduler skulle alle funktioner
   være globale og indlæses i den rigtige rækkefølge.
5. **Hvordan undgår I XSS?** Tekst sættes med `textContent` via `el()`, aldrig med `innerHTML`.
6. **Hvorfor tjekke formularer både i browseren og i backenden?** Browserens tjek giver hurtig besked.
   Backendens tjek er det, der gælder, for browserens kan omgås.
7. **Hvad er debounce?** Søgefeltet venter 250 ms efter sidste tastetryk, før det spørger backenden,
   så der ikke sendes et kald for hvert bogstav.
8. **Hvordan ser man, at et sæde er blevet taget af en anden?** Sædekortet henter sæderne igen hvert
   30. sekund. Vælger to alligevel samme sæde, svarer backenden 409, og siden sender brugeren tilbage til kortet.
9. **Hvordan kan siden bruges med tastatur?** Alle knapper er rigtige `<button>`-elementer. I sædekortet
   flytter piletasterne fokus (roving tabindex), og hvert sæde har en `aria-label`.
10. **Hvorfor skjule menupunkter, når backenden alligevel tjekker rollen?** For brugerens skyld.
    Sikkerheden ligger i backenden.
