# Weatherly Frontend

Weatherly is a responsive, dynamic weather interface built with Vanilla JavaScript and Vite.

---

## Local Development

### Requirements
- **Node.js**: 20.19+ or 22.12+ (tested with Node 20/22/24)
- **npm**: 10+

### Setup and Start
```sh
npm install
npm run dev
```

The application runs at `http://localhost:5173`.
The Vite dev server proxies `/api` calls to the Spring Boot backend at `http://localhost:8080`.
Ensure the backend is running for live weather forecasts.

### Run Tests
```sh
npm test
```

### Build for Production
```sh
npm run build
```

Production output is generated in `dist/`.

---

## Render Deployment Guide

Deploy this repository as a **Static Site** on Render:

1. **New Static Site**: Connect your GitHub repository `weatherly-frontend`.
2. **Build Settings**:
   - **Build Command**: `npm install && npm run build` (or `npm ci && npm run build`)
   - **Publish Directory**: `dist`
3. **Environment Variables**:
   In your Render Dashboard under **Environment**:

   | Key | Value | Purpose |
   |---|---|---|
   | `VITE_API_BASE_URL` | `https://weatherly-backend-9dfy.onrender.com` | Base URL of the deployed Spring Boot backend. |

> **Important**: Vite embeds `VITE_*` environment variables during build time (`npm run build`). If you set or change `VITE_API_BASE_URL` in the Render dashboard, trigger a **Manual Deploy > Clear build cache & deploy** for changes to take effect.

---

## Troubleshooting

- **Error: "Can't reach the weather backend"**:
  - Verify that the backend service at `https://weatherly-backend-9dfy.onrender.com` is active and healthy (visit `https://weatherly-backend-9dfy.onrender.com/health` to confirm).
  - Verify that `VITE_API_BASE_URL` is set to the exact backend URL in Render environment settings without trailing slashes.
  - Verify that the backend allows your frontend domain in `CORS_ALLOWED_ORIGINS`.
