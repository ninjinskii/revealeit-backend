# Revealeit backend
Revealeit server hosting a single game between multiple players.

## Release process
Deno deploy automatically deploy this project whenever master branch receive updates.

## Run the project on your machine
Make sure [traefik](https://github.com/ninjinskii/traefik) is running.

```bash
cd revealeit-backend
docker compose up -d
```

Server is only accepting Websocket connections, so you can't acces it using your browser.
