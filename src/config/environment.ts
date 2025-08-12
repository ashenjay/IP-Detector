const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Base URL configuration
const getBaseUrl = () => {
  if (isDevelopment) {
    // Development: Vite dev server with proxy
    return '';
  } else {
    // Production: Same origin as the served app
    return window.location.origin;
  }
};

export const config = {
  apiBaseUrl: getBaseUrl(),
  isDevelopment,
  isProduction,
  // Ensure we use HTTP protocol for local development
  apiUrl: isDevelopment ? 'http://localhost:5173/api' : `${getBaseUrl()}/api`
};

export default config;