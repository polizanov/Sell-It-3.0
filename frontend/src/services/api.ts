import axios from 'axios';

// In dev, Vite proxies `/api/*` to the backend (see `vite.config.ts`).
export const api = axios.create({
  baseURL: ''
});

