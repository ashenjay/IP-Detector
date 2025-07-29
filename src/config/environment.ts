// Environment configuration - Dynamic based on environment
export const CONFIG = {
  environment: import.meta.env.DEV ? 'development' : 'production',
  isNetlify: import.meta.env.NETLIFY === 'true',
  isProduction: !import.meta.env.DEV,
  isDevelopment: import.meta.env.DEV,
  
  // API endpoints - Use local server in development, production server in production
  apiEndpoint: 'https://threatresponse.ndbbank.com/api',
    
  // Feature flags - Dynamic based on environment
  features: {
    realTimeSync: true,
    mockData: import.meta.env.NETLIFY === 'true',
    proxyAPIs: false
  },
  
  // Production database configuration
  database: {
    host: 'threatresponse.ndbbank.com',
    port: 5432,
    name: 'threatresponse',
    ssl: true
  }
};

// Dynamic environment message
export const getEnvironmentMessage = () => {
  return {
    type: 'success',
    title: 'Production Database',
    message: 'Connected to production database: threatresponse.ndbbank.com'
  };
};