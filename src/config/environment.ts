// Environment configuration - AWS RDS PostgreSQL ONLY
export const CONFIG = {
  environment: 'production',
  isNetlify: false,
  isProduction: true,
  isDevelopment: false,
  
  // API endpoints - AWS EC2 server
  apiEndpoint: 'http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com/api',
    
  // Feature flags - real database only
  features: {
    realTimeSync: true,
    mockData: false,
    proxyAPIs: false
  }
};

// No environment messages - production only
export const getEnvironmentMessage = () => {
  return {
    type: 'success',
    title: 'AWS EC2 Production Server',
    message: 'Connected to AWS EC2 instance: ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com'
  };
};