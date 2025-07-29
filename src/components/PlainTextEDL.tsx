import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCategory } from '../contexts/CategoryContext';
import { useIP } from '../contexts/IPContext';
import { CONFIG } from '../config/environment';

interface PlainTextEDLProps {
  category: string;
  categoryName?: string;
}

const PlainTextEDL: React.FC<PlainTextEDLProps> = ({ category, categoryName }) => {
  const { user } = useAuth();
  const { getCategoryById } = useCategory();
  const { getEDLList } = useIP();
  const [edlList, setEdlList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryObj = getCategoryById(category);

  const loadEDLList = async () => {
    setLoading(true);
    try {
      // Direct API call to production server
      const response = await fetch(`https://threatresponse.ndbbank.com/api/edl/${category}`);
      if (response.ok) {
        const text = await response.text();
        const list = text.split('\n').filter(ip => ip.trim());
        setEdlList(list);
      } else {
        setEdlList([]);
      }
    } catch (error) {
      console.error('Failed to load EDL list:', error);
      setEdlList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEDLList();
  }, [category]);

  const canAccessCategory = (categoryId: string) => {
    if (user?.role === 'superadmin') return true;
    if (user?.role === 'soc_admin') return user.assignedCategories?.includes(categoryId) || false;
    return true; // viewers can view all
  };

  if (!categoryObj) {
    return (
      <div style={{ 
        fontFamily: 'monospace', 
        fontSize: '14px', 
        padding: '20px',
        backgroundColor: '#fff',
        color: '#333'
      }}>
        Category not found
      </div>
    );
  }

  if (!canAccessCategory(category)) {
    return (
      <div style={{ 
        fontFamily: 'monospace', 
        fontSize: '14px', 
        padding: '20px',
        backgroundColor: '#fff',
        color: '#333'
      }}>
        Access denied
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ 
        fontFamily: 'monospace', 
        fontSize: '14px', 
        padding: '20px',
        backgroundColor: '#fff',
        color: '#333'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ 
      fontFamily: 'monospace', 
      fontSize: '14px', 
      padding: '0',
      margin: '0',
      backgroundColor: '#fff',
      color: '#333',
      minHeight: '100vh',
      lineHeight: '1.4'
    }}>
      <pre style={{ 
        margin: '0', 
        padding: '20px',
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace',
        fontSize: '14px'
      }}>
        {edlList.length === 0 ? '# No entries found' : edlList.join('\n')}
      </pre>
    </div>
  );
};

export default PlainTextEDL;