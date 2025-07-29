// Environment configuration - Production Only
export const CONFIG = {
  environment: 'production',
  isNetlify: false,
  isProduction: true,
  isDevelopment: false,
  
  // API endpoints - Production server
  apiEndpoint: 'https://threatresponse.ndbbank.com/api',
    
  // Feature flags - production only
  features: {
    realTimeSync: true,
    mockData: false,
    proxyAPIs: false
  }
};

// Production environment message
export const getEnvironmentMessage = () => {
  return {
    type: 'success',
    title: 'Production Server',
    message: 'Connected to production server: threatresponse.ndbbank.com'
  };
};