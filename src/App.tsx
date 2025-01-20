import React from 'react';
import { Toaster } from 'react-hot-toast';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <Dashboard />
    </div>
  );
}

export default App;