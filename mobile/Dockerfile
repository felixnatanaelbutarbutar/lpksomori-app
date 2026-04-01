FROM ghcr.io/cirruslabs/flutter:stable AS build

WORKDIR /app

COPY pubspec.yaml ./
RUN flutter pub get

COPY lib ./lib

# Aktifkan dukungan web lalu build (dijalankan sebagai root seperti rekomendasi image resmi)
RUN flutter config --enable-web && flutter build web --release

FROM nginx:alpine

WORKDIR /usr/share/nginx/html

COPY --from=build /app/build/web ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

