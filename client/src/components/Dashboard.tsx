import { useState } from 'react';
import { AdminDashboard } from './admin/AdminDashboard';
import { GuruDashboard } from './guru/GuruDashboard';
import { SiswaDashboard } from './siswa/SiswaDashboard';
import { Sidebar } from './shared/Sidebar';
import type { AuthResponse } from '../../../server/src/schema';

interface DashboardProps {
  user: NonNullable<AuthResponse['user']>;
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderDashboard = () => {
    switch (user.role) {
      case 'admin':
        return (
          <AdminDashboard 
            user={user} 
            currentPage={currentPage} 
            onPageChange={setCurrentPage}
          />
        );
      case 'guru':
        return (
          <GuruDashboard 
            user={user} 
            currentPage={currentPage} 
            onPageChange={setCurrentPage}
          />
        );
      case 'siswa':
        return (
          <SiswaDashboard 
            user={user} 
            currentPage={currentPage} 
            onPageChange={setCurrentPage}
          />
        );
      default:
        return <div>Role tidak dikenali</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex">
      {/* Sidebar */}
      <Sidebar 
        user={user}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onLogout={onLogout}
      />
      
      {/* Main Content */}
      <div className="flex-1 ml-0 lg:ml-64 transition-all duration-300">
        {renderDashboard()}
      </div>
    </div>
  );
}