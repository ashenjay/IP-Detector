import React, { createContext, useContext, useState, useEffect } from 'react';
import { IPEntry, WhitelistEntry, IPContextType } from '../types';
import { useAuth } from './AuthContext';

const IPContext = createContext<IPContextType | undefined>(undefined);

export const IPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ipEntries, setIpEntries] = useState<IPEntry[]>([]);
  const [whitelistEntries, setWhitelistEntries] = useState<WhitelistEntry[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchIPEntries();
      fetchWhitelistEntries();
    }
  }, [user]);

  const fetchIPEntries = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com/api/ip-entries', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const formattedEntries = data.map((entry: any) => ({
          ...entry,
          dateAdded: new Date(entry.date_added),
          lastModified: new Date(entry.last_modified),
          addedBy: entry.added_by,
          sourceCategory: entry.source_category,
          vtReputation: entry.vt_reputation
        }));
        setIpEntries(formattedEntries);
      }
    } catch (error) {
      console.error('Failed to fetch IP entries:', error);
    }
  };

  const fetchWhitelistEntries = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com/api/whitelist', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const formattedEntries = data.map((entry: any) => ({
          ...entry,
          dateAdded: new Date(entry.date_added),
          addedBy: entry.added_by
        }));
        setWhitelistEntries(formattedEntries);
      }
    } catch (error) {
      console.error('Failed to fetch whitelist entries:', error);
    }
  };

  const addIP = async (ip: string, category: string, description?: string): Promise<boolean> => {
    if (!user) return false;
    
    if (user.role === 'soc_admin' && (!user.assignedCategories?.includes(category) || !user.isActive)) {
      return false;
    }
    
    console.log('Adding IP to category:', { ip, category, description });
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com/api/ip-entries', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ip: ip.trim(),
          category,
          description: description?.trim()
        })
      });

      console.log('Add IP response status:', response.status);
      
      if (response.ok) {
        console.log('IP added successfully, refreshing data...');
        await fetchIPEntries();
        return true;
      } else {
        const errorData = await response.json();
        console.error('Failed to add IP:', errorData);
      }
    } catch (error) {
      console.error('Add IP error:', error);
    }

    return false;
  };

  const deleteIP = async (id: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com/api/ip-entries/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchIPEntries();
        return true;
      }
    } catch (error) {
      console.error('Delete IP error:', error);
    }

    return false;
  };

  const addToWhitelist = async (ip: string, description?: string): Promise<boolean> => {
    if (!user || user.role !== 'superadmin' || !user.isActive) return false;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com/api/whitelist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ip: ip.trim(),
          description: description?.trim()
        })
      });

      if (response.ok) {
        await fetchWhitelistEntries();
        return true;
      }
    } catch (error) {
      console.error('Add to whitelist error:', error);
    }

    return false;
  };

  const removeFromWhitelist = async (id: string): Promise<boolean> => {
    if (!user || user.role !== 'superadmin' || !user.isActive) return false;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com/api/whitelist/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchWhitelistEntries();
        return true;
      }
    } catch (error) {
      console.error('Remove from whitelist error:', error);
    }

    return false;
  };

  const getEDLList = async (category: string): Promise<string[]> => {
    try {
      const response = await fetch(`http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com/api/edl/${category}`);
      if (response.ok) {
        const text = await response.text();
        return text.split('\n').filter(ip => ip.trim());
      }
    } catch (error) {
      console.error('Get EDL list error:', error);
    }
    return [];
  };

  const syncAbuseIPDB = async (): Promise<void> => {
    if (!user || user.role === 'viewer' || !user.isActive) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com/api/sync/abuseipdb', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchIPEntries();
      }
    } catch (error) {
      console.error('Error syncing with AbuseIPDB:', error);
      throw error;
    }
  };

  const syncVirusTotal = async (): Promise<void> => {
    if (!user || user.role === 'viewer' || !user.isActive) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com/api/sync/virustotal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchIPEntries();
      }
    } catch (error) {
      console.error('Error syncing with VirusTotal:', error);
      throw error;
    }
  };

  const updateSourceIPs = async (): Promise<void> => {
    if (!user || user.role === 'viewer' || !user.isActive) return;
    await fetchIPEntries();
  };

  const checkIPReputation = async (ip: string): Promise<any> => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com/api/ip-entries/check/${ip}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        await fetchIPEntries();
        return data;
      }
    } catch (error) {
      console.error('Error checking IP reputation:', error);
      throw error;
    }
  };

  const refreshData = async (): Promise<void> => {
    await Promise.all([fetchIPEntries(), fetchWhitelistEntries()]);
  };

  const extractFromSources = async (sourceIds: string[], targetCategory: string): Promise<boolean> => {
    if (!user || user.role === 'viewer' || !user.isActive) return false;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com/api/ip-entries/extract', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceIds,
          targetCategory
        })
      });

      if (response.ok) {
        await fetchIPEntries();
        return true;
      }
    } catch (error) {
      console.error('Extract from sources error:', error);
    }

    return false;
  };

  const bulkExtractFromSources = async (): Promise<void> => {
    if (!user || user.role === 'viewer' || !user.isActive) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com/api/ip-entries/bulk-extract', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchIPEntries();
      }
    } catch (error) {
      console.error('Bulk extract error:', error);
    }
  };

  return (
    <IPContext.Provider value={{
      ipEntries,
      whitelistEntries,
      addIP,
      deleteIP,
      addToWhitelist,
      removeFromWhitelist,
      getEDLList,
      refreshData,
      syncAbuseIPDB,
      syncVirusTotal,
      checkIPReputation,
      updateSourceIPs,
      extractFromSources,
      bulkExtractFromSources
    }}>
      {children}
    </IPContext.Provider>
  );
}

export const useIP = (): IPContextType => {
  const context = useContext(IPContext);
  if (!context) {
    throw new Error('useIP must be used within an IPProvider');
  }
  return context;
};