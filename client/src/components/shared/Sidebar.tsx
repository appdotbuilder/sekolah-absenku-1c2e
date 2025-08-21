import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  LayoutDashboard, 
  Users, 
  Calendar,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  School,
  BookOpen,
  GraduationCap,
  UserCheck,
  FileText,
  Clock
} from 'lucide-react';
import type { AuthResponse } from '../../../../server/src/schema';

interface SidebarProps {
  user: NonNullable<AuthResponse['user']>;
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
}

export function Sidebar({ user, currentPage, onPageChange, onLogout }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Define menu items based on role
  const getMenuItems = () => {
    const commonItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'profile', label: 'Profil', icon: Settings },
    ];

    switch (user.role) {
      case 'admin':
        return [
          ...commonItems.slice(0, 1), // Dashboard
          { id: 'users', label: 'Kelola Pengguna', icon: Users },
          { id: 'students', label: 'Data Siswa', icon: BookOpen },
          { id: 'teachers', label: 'Data Guru', icon: GraduationCap },
          { id: 'classes', label: 'Data Kelas', icon: School },
          { id: 'attendance', label: 'Absensi', icon: UserCheck },
          { id: 'reports', label: 'Laporan', icon: FileText },
          { id: 'statistics', label: 'Statistik', icon: BarChart3 },
          ...commonItems.slice(1), // Profile
        ];
      
      case 'guru':
        return [
          ...commonItems.slice(0, 1), // Dashboard
          { id: 'my-class', label: 'Kelas Saya', icon: School },
          { id: 'attendance', label: 'Absensi', icon: UserCheck },
          { id: 'attendance-input', label: 'Input Absensi', icon: ClipboardList },
          { id: 'leave-requests', label: 'Pengajuan Izin', icon: Calendar },
          { id: 'reports', label: 'Rekap Absensi', icon: FileText },
          ...commonItems.slice(1), // Profile
        ];
      
      case 'siswa':
        return [
          ...commonItems.slice(0, 1), // Dashboard
          { id: 'attendance', label: 'Absensi', icon: Clock },
          { id: 'history', label: 'Riwayat', icon: Calendar },
          { id: 'leave-request', label: 'Pengajuan Izin', icon: ClipboardList },
          ...commonItems.slice(1), // Profile
        ];
      
      default:
        return commonItems;
    }
  };

  const menuItems = getMenuItems();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Users className="w-5 h-5" />;
      case 'guru': return <GraduationCap className="w-5 h-5" />;
      case 'siswa': return <BookOpen className="w-5 h-5" />;
      default: return <School className="w-5 h-5" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'guru': return 'Guru';
      case 'siswa': return 'Siswa';
      default: return 'Pengguna';
    }
  };

  const handleMenuClick = (pageId: string) => {
    onPageChange(pageId);
    setIsMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-white/80 backdrop-blur-md border-r border-white/20 shadow-xl">
      {/* Header */}
      <div className="p-6 border-b border-gray-200/50">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <School className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-800">Sekolah Absenku</h1>
            <p className="text-xs text-gray-600">Sistem Absensi Digital</p>
          </div>
        </div>
        
        {/* User Info */}
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              {getRoleIcon(user.role)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-800 truncate">
                {user.profile?.nama || user.username || user.nip || user.nisn}
              </h3>
              <p className="text-sm text-gray-600">{getRoleLabel(user.role)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start space-x-3 h-12 transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                  : 'hover:bg-blue-50 text-gray-700 hover:text-blue-700'
              }`}
              onClick={() => handleMenuClick(item.id)}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200/50">
        <Button
          variant="outline"
          className="w-full justify-start space-x-3 h-12 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Keluar</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-md border-white/20 shadow-lg"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 w-64 h-full z-40">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 w-64 h-full">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}