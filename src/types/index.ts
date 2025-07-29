export interface User {
  id: string;
  username: string;
  email: string;
  role: 'viewer' | 'soc_admin' | 'superadmin';
  assignedCategories?: string[]; // Array of category IDs
  createdBy?: string;
  createdAt?: Date;
  isActive?: boolean;
  password?: string; // For demo purposes - in production this would be hashed
  mustChangePassword: boolean; // ✅ NEW
  passwordChangedAt?: Date; // When password was last changed
  passwordExpiresAt?: Date; // When password expires (null for admins)
  passwordStatus?: 'Active' | 'Expiring Soon' | 'Expired' | 'No Expiration' | 'Not Set';
  daysUntilExpiry?: number; // Days until expiry (negative if expired)
}

export interface Category {
  id: string;
  name: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  isDefault: boolean; // Cannot be deleted
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
  expirationDays?: number | null; // Days after which IP entries expire (1-31)
  autoCleanup?: boolean; // Auto cleanup expired data
  ipCount?: number; // Number of IPs in category
}

export interface IPEntry {
  id: string;
  ip: string; // Can be IP, hostname, or FQDN
  type: 'ip' | 'hostname' | 'fqdn';
  category: string; // Now references category.id
  description?: string;
  addedBy: string;
  dateAdded: Date;
  lastModified: Date;
  expiresAt?: Date; // ✅ NEW: When this IP entry expires
  autoRemove?: boolean; // ✅ NEW: Auto-remove when expired
  source: 'manual' | 'abuseipdb' | 'other';
  sourceCategory?: string; // For sources category, this stores the original threat type
  reputation?: {
    abuseConfidence: number;
    totalReports: number;
    lastReported?: Date;
    countryCode?: string;
    isp?: string;
  };
  vtReputation?: {
    maliciousPercentage: number;
    detectionStats: {
      harmless: number;
      malicious: number;
      suspicious: number;
      undetected: number;
      timeout: number;
    };
    reputation: number;
    country: string;
    asOwner: string;
    network: string;
  };
}

export interface WhitelistEntry {
  id: string;
  ip: string; // Can be IP, hostname, or FQDN
  type: 'ip' | 'hostname' | 'fqdn';
  description?: string;
  addedBy: string;
  dateAdded: Date;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success?: boolean; forcePasswordChange?: boolean }>; // ✅ UPDATED
  logout: () => void;
  isAuthenticated: boolean;
  users: User[];
  createUser: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<boolean>;
  updateUser: (userId: string, userData: Partial<User>) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  toggleUserStatus: (userId: string) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
  updatePassword: (newPassword: string, currentPassword?: string) => Promise<{ success: boolean; message?: string }>; // ✅ UPDATED
  passwordStatus?: any; // Current user's password status
}

export interface CategoryContextType {
  categories: Category[];
  createCategory: (categoryData: Omit<Category, 'id' | 'createdAt' | 'createdBy'>) => Promise<boolean>;
  updateCategory: (categoryId: string, categoryData: Partial<Category>) => Promise<boolean>;
  deleteCategory: (categoryId: string, migrateTo?: string) => Promise<boolean>;
  toggleCategoryStatus: (categoryId: string) => Promise<boolean>;
  refreshCategories: () => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryByName: (name: string) => Category | undefined;
}

export interface IPContextType {
  ipEntries: IPEntry[];
  whitelistEntries: WhitelistEntry[];
  addIP: (ip: string, category: string, description?: string) => Promise<{ success: boolean; message?: string }>;
  deleteIP: (id: string) => Promise<boolean>;
  addToWhitelist: (ip: string, description?: string) => Promise<{ success: boolean; message?: string }>;
  removeFromWhitelist: (id: string) => Promise<boolean>;
  getEDLList: (category: string) => Promise<string[]>;
  refreshData: () => Promise<void>;
  syncAbuseIPDB: () => Promise<void>;
  checkIPReputation: (ip: string) => Promise<any>;
  syncVirusTotal: () => Promise<void>;
  updateSourceIPs: () => Promise<void>;
  extractFromSources: (sourceIds: string[], targetCategory: string) => Promise<boolean>;
  bulkExtractFromSources: () => Promise<void>;
}
