FROM denoland/deno:debian-1.24.3

EXPOSE 5000

WORKDIR /app

USER deno

COPY deps.ts .
RUN deno cache deps.ts

ADD . .

RUN deno cache ./src/main.ts

CMD ["run", "--allow-read", "--allow-net", "--watch", "./src/main.ts", "./src/main.ts"]
