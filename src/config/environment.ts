const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Base URL configuration - use relative URLs to avoid localhost
const getBaseUrl = () => {
  // Always use relative URLs to work with any domain
  return '';
};

export const config = {
  apiBaseUrl: getBaseUrl(),
  isDevelopment,
  isProduction,
  // Use relative URLs for API endpoints
  apiUrl: '/api',
  apiEndpoint: '/api',
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