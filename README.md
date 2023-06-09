# Revealeit backend
Revealeit server hosting a single game between multiple players.

## Release process
- Merger target code in master
- Create a tag named `x.x.x`
- Push tag
- Go to [deno deploy](https://dash.deno.com/projects/revealeit-backend/deployments), and promote deployment to production via the deployment tab

## Run the project on your machine
Make sure [traefik](https://github.com/ninjinskii/traefik) is running.

```bash
cd revealeit-backend
docker compose up -d
```

Server is only accepting Websocket connections, so you can't acces it using your browser.
Websocket url is: `ws://revealeit-backend.njk.localhost:5000/`

## Run unit tests
```bash
docker-compose up -d
docker-compose exec server deno test --allow-env
```

## Revealeit rules
The game is conceived to be adaptable using the `Rules` class.

But base rules are: 
- A piece can only make a move inside its reveal area (to avoid bumping into unrevealed pieces)
- Reveal area can outrange the move distance
- Pieces spawn on the same spot relativly to the player origin
