import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CategoryProvider } from './contexts/CategoryContext';
import { IPProvider } from './contexts/IPContext';
import { LoginForm } from './components/LoginForm';
import Router from './components/Router';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <CategoryProvider>
      <IPProvider>
        <Router />
      </IPProvider>
    </CategoryProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;