FROM denoland/deno:latest AS builder

WORKDIR /build

COPY . .

RUN deno install

CMD ["run","-A","main.ts"]
