export const API_URL =
    import.meta.env.DEV
        ? "http://localhost:8081"           // local dev
        : import.meta.env.VITE_API_URL;     // production
