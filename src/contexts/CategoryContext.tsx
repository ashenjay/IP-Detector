import React, { createContext, useContext, useState, useEffect } from 'react';
import { Category, CategoryContextType } from '../types';
import { useAuth } from './AuthContext';

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  // Listen for refresh events from IP operations
  useEffect(() => {
    const handleRefreshCategories = () => {
      console.log('Refreshing categories due to IP operation');
      fetchCategories();
    };

    window.addEventListener('refreshCategories', handleRefreshCategories);
    return () => window.removeEventListener('refreshCategories', handleRefreshCategories);
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('https://threatresponse.ndbbank.com/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const categoriesData = await response.json();
        console.log('🔍 Raw categories data from API:');
        categoriesData.forEach((c: any) => {
          console.log(`Category ${c.name}: ip_count = ${c.ip_count} (type: ${typeof c.ip_count})`);
        });
        
        const formattedCategories = categoriesData.map((c: any) => ({
          ...c,
          createdAt: new Date(c.created_at),
          isActive: c.is_active,
          isDefault: c.is_default,
          createdBy: c.created_by || 'Unknown',
          expirationHours: c.expiration_hours || null,
          autoCleanup: Boolean(c.auto_cleanup),
          ipCount: parseInt(c.ip_count, 10) || 0
        }));
        
        console.log('🔍 Formatted categories with IP counts:', 
          formattedCategories.map(c => ({ 
            name: c.name, 
            ipCount: c.ipCount, 
            rawCount: c.ip_count,
            type: typeof c.ip_count 
          }))
        );
        
        setCategories(formattedCategories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const createCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'createdBy'>): Promise<boolean> => {
    if (!user || user.role !== 'superadmin' || !user.isActive) return false;
    
    try {
      console.log('Sending category data to API:', categoryData);
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch('https://threatresponse.ndbbank.com/api/categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: categoryData.name,
          label: categoryData.label,
          description: categoryData.description,
          color: categoryData.color,
          icon: categoryData.icon,
          expirationHours: categoryData.expirationHours,
          autoCleanup: categoryData.autoCleanup || false
        })
      });

      if (response.ok) {
        await fetchCategories();
        return true;
      } else {
        const errorData = await response.json();
        console.error('Create category failed:', errorData);
      }
    } catch (error) {
      console.error('Create category error:', error);
    }

    return false;
  };

  const updateCategory = async (categoryId: string, categoryData: Partial<Category>): Promise<boolean> => {
    if (!user || user.role !== 'superadmin' || !user.isActive) return false;
    
    try {
      console.log('CategoryContext: Updating category with data:', categoryData);
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`https://threatresponse.ndbbank.com/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: categoryData.name,
          label: categoryData.label,
          description: categoryData.description,
          color: categoryData.color,
          icon: categoryData.icon,
          isActive: categoryData.isActive,
          expirationHours: categoryData.expirationHours,
          autoCleanup: categoryData.autoCleanup
        })
      });

      console.log('CategoryContext: Update response status:', response.status);
      
      if (response.ok) {
        console.log('CategoryContext: Update successful, refreshing categories');
        await fetchCategories();
        return true;
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('CategoryContext: Failed to parse error response:', parseError);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.error('CategoryContext: Update failed:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Update failed`);
      }
    } catch (error) {
      console.error('Update category error:', error);
      throw error;
    }

    return false;
  };

  const deleteCategory = async (categoryId: string, migrateTo?: string): Promise<boolean> => {
    if (!user || user.role !== 'superadmin' || !user.isActive) return false;
    
    console.log('Deleting category:', categoryId, 'migrateTo:', migrateTo);
    
    try {
      const token = localStorage.getItem('auth_token');
      const url = migrateTo ? `https://threatresponse.ndbbank.com/api/categories/${categoryId}?migrateTo=${migrateTo}` : `https://threatresponse.ndbbank.com/api/categories/${categoryId}`;
      
      console.log('Making delete request to:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Delete category response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete category failed:', errorData);
        return false;
      }
      
      if (response.ok) {
        console.log('Category deleted successfully, refreshing categories');
        await fetchCategories();
        return true;
      }
    } catch (error) {
      console.error('Delete category error:', error);
    }

    return false;
  };

  const toggleCategoryStatus = async (categoryId: string): Promise<boolean> => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return false;

    return await updateCategory(categoryId, { isActive: !category.isActive });
  };

  const refreshCategories = async (): Promise<void> => {
    await fetchCategories();
  };

  const getCategoryById = (id: string): Category | undefined => {
    return categories.find(c => c.id === id);
  };

  const getCategoryByName = (name: string): Category | undefined => {
    return categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  };

  return (
    <CategoryContext.Provider value={{
      categories,
      createCategory,
      updateCategory,
      deleteCategory,
      toggleCategoryStatus,
      refreshCategories,
      getCategoryById,
      getCategoryByName
    }}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategory = (): CategoryContextType => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategory must be used within a CategoryProvider');
  }
  return context;
};