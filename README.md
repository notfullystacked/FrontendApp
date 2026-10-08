# FrontendApp

Websitet til biografen Kino. Bygget med HTML, CSS, Bootstrap og ren JavaScript (`fetch`), uden frameworks.
Det taler med backenden i projektet `BackendApp`.

## Sådan kører du det

1. Start backenden: kør `SmartBioBackendApplication` i `BackendApp`. Den skal svare på `http://localhost:8080`.
2. Åbn `index.html` her i IntelliJ, og klik på browser-ikonet øverst til højre i editoren.
   Siden åbner på `http://localhost:63342/FrontendApp/index.html`.

Åbn ikke filen direkte fra Finder (`file://...`). Så virker JavaScript-modulerne og kaldene til backenden ikke.

Testbrugere til personalesiderne (alle har koden `kode123`):

| Brugernavn | Roller | Ser |
|---|---|---|
| `mads` | Admin, Clerk | Alt |
| `oliver` | Operator, MovieEditor | Film, forestillinger, bookinger |
| `sofie` | Clerk | Bookinger, billetkontrol, rengøring |
| `emma` | Inspector | Bookinger, billetkontrol, rengøring |

Personalet logger ind via linket nederst på siden, eller på `personale/login.html`.

## Mere

- [Forklaring af opbygningen, valgene og typiske eksamensspørgsmål](docs/frontend-guide.md)
- Docker: `docker build -t kino-frontend .` og `docker run -p 3000:80 kino-frontend`. Siden ligger så på `http://localhost:3000`.
