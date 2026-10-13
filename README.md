# Weatherly Frontend

Weatherly is a Vite-powered weather interface.

## Local development

```sh
npm install
npm run dev
```

The Vite development server proxies `/api` requests to the backend at
`http://localhost:8080`. The backend must be running for live weather searches.

## Production build

```sh
npm ci
npm run build
```

The static site is generated in `dist/`. Configure your hosting provider to
serve that directory. Set the build environment variable
`VITE_API_BASE_URL` to the deployed Weatherly backend's public origin (for
example, `https://your-weatherly-backend.example.com`). The frontend sends API
requests to that origin. Leave the variable unset for local development, where
the Vite proxy in `vite.config.js` forwards `/api` to `http://localhost:8080`.
