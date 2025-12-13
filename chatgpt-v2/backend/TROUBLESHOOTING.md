# Troubleshooting

## Error: Cannot find module '/app/dist/index.js'

This means `/app/dist/index.js` does not exist inside the running container.

Most common cause:
- Your docker-compose mounts `./backend:/app` (or similar). That bind-mount overwrites the image filesystem and removes `/app/dist`.

Fix:
1) Remove the backend bind mount (or use a dev container with `npm run dev`)
2) Rebuild image and restart

Commands:
- docker compose down -v
- docker compose build backend --no-cache
- docker compose up backend
