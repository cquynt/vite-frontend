FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npx texlyre-busytex download-assets ./public/core
RUN npm run build


FROM busybox:stable-musl AS runtime
COPY --from=build /app/dist /www
USER 65534:65534
EXPOSE 8080
CMD ["httpd", "-f", "-p", "8080", "-h", "/www"]
