const isProduction = true;
const isDevelopment = false;

export const config = {
  apiBaseUrl: '',
  isDevelopment: false,
  isProduction: true,
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