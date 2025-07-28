import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from './Dashboard';
import IPList from './IPList';
import EDLView from './EDLView';
import UserManagement from './UserManagement';
import CategoryManagement from './CategoryManagement';
import ChangePassword from './ChangePassword'; // ✅ New import
import PlainTextEDL from './PlainTextEDL';

import { useCategory } from '../contexts/CategoryContext';
import { AlertCircle } from 'lucide-react';

const Router: React.FC = () => {
  const { isAuthenticated, user } = useAuth(); // ✅ include user
  const { categories } = useCategory();
  const [currentPath, setCurrentPath] = React.useState(window.location.hash || '#/');

  React.useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || '#/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (!isAuthenticated) {
    return null; // Login form will be shown by App.tsx
  }

  const path = currentPath.replace('#/', '');
  const segments = path.split('/');

  // ✅ If user is forced to change password, block access to all routes except `#/change-password`
  if (user?.mustChangePassword && path !== 'change-password') {
    window.location.hash = '#/change-password';
    return null;
  }

  // ✅ Handle password change route
  if (path === 'change-password') {
    return <ChangePassword />;
  }

  if (path === '' || path === '/') {
    return <Dashboard />;
  }

  if (segments[0] === 'list' && segments[1]) {
    const category = segments[1];
    console.log('Navigating to IP list for category:', category);
    return <IPList category={category} />;
  }

  if (segments[0] === 'edl' && segments[1]) {
    const categoryName = segments[1];
    
    // Check for plain text EDL request
    if (segments[2] === 'plain' || currentPath.includes('?format=plain')) {
      const category = categories.find(c => c.name === categoryName);
      if (category) {
        return <PlainTextEDL category={category.id} categoryName={categoryName} />;
      }
      const categoryById = categories.find(c => c.id === categoryName);
      if (categoryById) {
        return <PlainTextEDL category={categoryById.id} categoryName={categoryById.name} />;
      }
    }
    
    const category = categories.find(c => c.name === categoryName);
    if (category) {
      return <EDLView category={category.id} categoryName={categoryName} />;
    }
    const categoryById = categories.find(c => c.id === categoryName);
    if (categoryById) {
      return <EDLView category={categoryById.id} categoryName={categoryById.name} />;
    }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Category Not Found</h2>
          <p className="text-gray-600">The category "{categoryName}" does not exist.</p>
          <button
            onClick={() => window.location.hash = '/'}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (path === 'whitelist') {
    return <IPList isWhitelist={true} />;
  }

  if (path === 'users') {
    return <UserManagement />;
  }

  if (path === 'categories') {
    return <CategoryManagement />;
  }

  return <Dashboard />;
};

export default Router;
