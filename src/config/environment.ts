// Environment configuration - Dynamic based on environment
export const CONFIG = {
  environment: import.meta.env.DEV ? 'development' : 'production',
  isNetlify: import.meta.env.NETLIFY === 'true',
  isProduction: !import.meta.env.DEV,
  isDevelopment: import.meta.env.DEV,
  
  // API endpoints - Always use production
  apiEndpoint: 'https://threatresponse.ndbbank.com/api',
    
  // Feature flags - Always use production settings
  features: {
    realTimeSync: true,
    mockData: false,
    proxyAPIs: false
  }
};

// Dynamic environment message
export const getEnvironmentMessage = () => {
  if (import.meta.env.DEV) {
    return {
      type: 'info',
      title: 'Development Mode',
      message: 'Connected to production server: threatresponse.ndbbank.com'
    };
  } else {
    return {
      type: 'success',
      title: 'Production Server',
      message: 'Connected to production server: threatresponse.ndbbank.com'
    };
  }
};