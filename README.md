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
serve that directory and forward `/api` requests to the deployed Weatherly
backend. The proxy in `vite.config.js` is for local development only.
