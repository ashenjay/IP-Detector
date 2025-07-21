// AWS Configuration - Auto-generated during deployment
export const AWS_CONFIG = {
  region: 'us-east-1', // Will be replaced during deployment
  tables: {
    users: 'ThreatIntel-Users',
    categories: 'ThreatIntel-Categories',
    ipEntries: 'ThreatIntel-IPEntries',
    whitelist: 'ThreatIntel-Whitelist'
  },
  // For easy deployment, we use localStorage as primary storage
  // DynamoDB tables are created but used as backup/sync
  useLocalStorage: true
};