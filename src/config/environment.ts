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
  apiUrl: isDevelopment ? 'http://localhost:5173/api' : `${getBaseUrl()}/api`,
  apiEndpoint: isDevelopment ? 'http://localhost:5173/api' : `${getBaseUrl()}/api`,
  isNetlify: import.meta.env.VITE_NETLIFY === 'true'
};

export const getEnvironmentMessage = () => {
  if (config.isNetlify) {
    return 'Demo Mode';
  }
  return '';
};

// Export as CONFIG for backward compatibility
export const CONFIG = config;

export default config;