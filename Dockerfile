# Frontenden er kun statiske filer (HTML, CSS, JavaScript), så der skal ikke bygges noget.
# Filerne kopieres ind i en nginx-webserver.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html program.html film.html booking.html bekraeftelse.html billet.html konto.html mine-bookinger.html sale.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY personale/ /usr/share/nginx/html/personale/
EXPOSE 80
