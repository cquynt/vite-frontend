FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build


FROM busybox:stable-musl AS runtime
COPY --from=build /app/dist /www
EXPOSE 80
CMD ["httpd", "-f", "-p", "80", "-h", "/www"]
