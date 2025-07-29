// Environment configuration - Dynamic based on environment
export const CONFIG = {
  environment: import.meta.env.DEV ? 'development' : 'production',
  isNetlify: import.meta.env.NETLIFY === 'true',
  isProduction: !import.meta.env.DEV,
  isDevelopment: import.meta.env.DEV,
  
  // API endpoints - Dynamic based on environment
  apiEndpoint: import.meta.env.DEV 
    ? 'http://localhost:3000/api'
    : 'https://threatresponse.ndbbank.com/api',
    
  // Feature flags - Dynamic based on environment
  features: {
    realTimeSync: true,
    mockData: import.meta.env.DEV,
    proxyAPIs: import.meta.env.DEV
  }
};

// Dynamic environment message
export const getEnvironmentMessage = () => {
  if (import.meta.env.DEV) {
    return {
      type: 'info',
      title: 'Development Server',
      message: 'Connected to local development server: localhost:3000'
    };
  } else {
    return {
      type: 'success',
      title: 'Production Server',
      message: 'Connected to production server: threatresponse.ndbbank.com'
    };
  }
};