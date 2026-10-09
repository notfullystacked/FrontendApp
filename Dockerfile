# Frontenden er kun statiske filer (HTML, CSS, JavaScript), så der skal ikke bygges noget.
# Filerne kopieres ind i en nginx-webserver.
FROM nginx:alpine

# nginx.conf lægges som skabelon. nginx-imaget udfylder ${BACKEND_URL} ved opstart
# og gemmer resultatet som /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Standard: backenden kører på din egen computer (Docker Desktop).
# På Azure overskrives den med en miljøvariabel på Web App'en
ENV BACKEND_URL=http://host.docker.internal:8080

# Alle html-filer i roden, så nye sider kommer med automatisk
COPY *.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY personale/ /usr/share/nginx/html/personale/
EXPOSE 80
