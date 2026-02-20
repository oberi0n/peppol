FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

COPY index.html app.js styles.css service-worker.js ./
COPY .well-known ./.well-known

EXPOSE 80
