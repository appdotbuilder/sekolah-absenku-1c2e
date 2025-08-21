import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import { StubDataService } from '../services/StubDataService';
import { 
  Users, 
  UserPlus, 
  School, 
  BookOpen, 
  GraduationCap, 
  BarChart3,
  FileText,
  Edit,
  Trash2,
  Plus,
  Eye
} from 'lucide-react';
import type { AuthResponse, User, Siswa, Guru, Kelas, DashboardStats } from '../../../../server/src/schema';

interface AdminDashboardProps {
  user: NonNullable<AuthResponse['user']>;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function AdminDashboard({ user, currentPage, onPageChange }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Siswa[]>([]);
  const [teachers, setTeachers] = useState<Guru[]>([]);
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Forms state
  const [newUser, setNewUser] = useState({
    username: '',
    nip: '',
    nisn: '',
    password: '',
    role: 'siswa' as 'admin' | 'guru' | 'siswa'
  });

  const [newClass, setNewClass] = useState({
    nama_kelas: '',
    wali_kelas_id: 0
  });

  // Load dashboard stats
  const loadStats = useCallback(async () => {
    try {
      // STUB: Using mock data service for demo
      const result = await StubDataService.getDashboardStats();
      setStats(result);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  // Load all users
  const loadUsers = useCallback(async () => {
    try {
      // STUB: Using mock data service for demo
      const result = await StubDataService.getAllUsers();
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  // Load all students
  const loadStudents = useCallback(async () => {
    try {
      // STUB: Using mock data service for demo
      const result = await StubDataService.getAllSiswa();
      setStudents(result);
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  }, []);

  // Load all teachers
  const loadTeachers = useCallback(async () => {
    try {
      // STUB: Using mock data service for demo
      const result = await StubDataService.getAllGuru();
      setTeachers(result);
    } catch (error) {
      console.error('Failed to load teachers:', error);
    }
  }, []);

  // Load all classes
  const loadClasses = useCallback(async () => {
    try {
      // STUB: Using mock data service for demo
      const result = await StubDataService.getAllKelas();
      setClasses(result);
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
  }, []);

  useEffect(() => {
    if (currentPage === 'dashboard') {
      loadStats();
    } else if (currentPage === 'users') {
      loadUsers();
    } else if (currentPage === 'students') {
      loadStudents();
    } else if (currentPage === 'teachers') {
      loadTeachers();
    } else if (currentPage === 'classes') {
      loadClasses();
      loadTeachers(); // For wali kelas selection
    }
  }, [currentPage, loadStats, loadUsers, loadStudents, loadTeachers, loadClasses]);

  // Handle create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const userData = {
        username: newUser.role === 'admin' ? newUser.username : null,
        nip: newUser.role === 'guru' ? newUser.nip : null,
        nisn: newUser.role === 'siswa' ? newUser.nisn : null,
        password: newUser.password,
        role: newUser.role
      };

      // STUB: Using mock data service for demo
      await StubDataService.createUser(userData);
      setNewUser({ username: '', nip: '', nisn: '', password: '', role: 'siswa' });
      await loadUsers();
      alert('User berhasil dibuat');
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Gagal membuat user');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle create class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // STUB: Using mock data service for demo
      await StubDataService.createKelas(newClass);
      setNewClass({ nama_kelas: '', wali_kelas_id: 0 });
      await loadClasses();
      alert('Kelas berhasil dibuat');
    } catch (error) {
      console.error('Failed to create class:', error);
      alert('Gagal membuat kelas');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;
    
    setIsLoading(true);
    try {
      // STUB: Using mock data service for demo
      await StubDataService.deleteUser({ id: userId });
      await loadUsers();
      alert('User berhasil dihapus');
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Gagal menghapus user');
    } finally {
      setIsLoading(false);
    }
  };

  if (currentPage === 'dashboard') {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Dashboard Administrator</h1>
          <p className="text-blue-100">Selamat datang, {user.username}!</p>
          <p className="text-sm text-blue-200">Panel kontrol sistem absensi</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white/80 backdrop-blur-md border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-blue-100">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{stats.total_siswa}</p>
                    <p className="text-sm text-gray-600">Total Siswa</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-md border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-green-100">
                    <GraduationCap className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{stats.total_guru}</p>
                    <p className="text-sm text-gray-600">Total Guru</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-md border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-purple-100">
                    <School className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{stats.total_kelas}</p>
                    <p className="text-sm text-gray-600">Total Kelas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-md border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-orange-100">
                    <FileText className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{stats.pengajuan_pending}</p>
                    <p className="text-sm text-gray-600">Pengajuan Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Today's Attendance Stats */}
        {stats && (
          <Card className="bg-white/80 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle>Statistik Absensi Hari Ini</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-3xl font-bold text-green-600">{stats.absensi_hari_ini.hadir}</p>
                  <p className="text-sm text-green-700">Hadir</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-3xl font-bold text-blue-600">{stats.absensi_hari_ini.izin}</p>
                  <p className="text-sm text-blue-700">Izin</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="text-3xl font-bold text-yellow-600">{stats.absensi_hari_ini.sakit}</p>
                  <p className="text-sm text-yellow-700">Sakit</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-3xl font-bold text-red-600">{stats.absensi_hari_ini.alpha}</p>
                  <p className="text-sm text-red-700">Alpha</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4">
          <Button 
            onClick={() => onPageChange('users')}
            variant="outline"
            className="h-24 flex-col space-y-2 bg-white/80 backdrop-blur-md border-white/20"
          >
            <Users className="w-8 h-8 text-blue-600" />
            <span>Kelola Pengguna</span>
          </Button>
          
          <Button 
            onClick={() => onPageChange('students')}
            variant="outline"
            className="h-24 flex-col space-y-2 bg-white/80 backdrop-blur-md border-white/20"
          >
            <BookOpen className="w-8 h-8 text-green-600" />
            <span>Data Siswa</span>
          </Button>
          
          <Button 
            onClick={() => onPageChange('teachers')}
            variant="outline"
            className="h-24 flex-col space-y-2 bg-white/80 backdrop-blur-md border-white/20"
          >
            <GraduationCap className="w-8 h-8 text-purple-600" />
            <span>Data Guru</span>
          </Button>
          
          <Button 
            onClick={() => onPageChange('classes')}
            variant="outline"
            className="h-24 flex-col space-y-2 bg-white/80 backdrop-blur-md border-white/20"
          >
            <School className="w-8 h-8 text-orange-600" />
            <span>Data Kelas</span>
          </Button>
        </div>
      </div>
    );
  }

  if (currentPage === 'users') {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Kelola Pengguna</h1>
        
        {/* Create User Form */}
        <Card className="bg-white/80 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle>Tambah Pengguna Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select 
                    value={newUser.role} 
                    onValueChange={(value: 'admin' | 'guru' | 'siswa') => 
                      setNewUser(prev => ({ ...prev, role: value, username: '', nip: '', nisn: '' }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="siswa">Siswa</SelectItem>
                      <SelectItem value="guru">Guru</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {newUser.role === 'admin' ? 'Username' : 
                     newUser.role === 'guru' ? 'NIP' : 'NISN'}
                  </label>
                  <Input
                    value={
                      newUser.role === 'admin' ? newUser.username :
                      newUser.role === 'guru' ? newUser.nip : newUser.nisn
                    }
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.target.value;
                      setNewUser(prev => ({
                        ...prev,
                        username: prev.role === 'admin' ? value : '',
                        nip: prev.role === 'guru' ? value : '',
                        nisn: prev.role === 'siswa' ? value : ''
                      }));
                    }}
                    placeholder={
                      newUser.role === 'admin' ? 'Masukkan username' :
                      newUser.role === 'guru' ? 'Masukkan NIP' : 'Masukkan NISN'
                    }
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setNewUser(prev => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="Masukkan password"
                    required
                  />
                </div>
              </div>
              
              <Button type="submit" disabled={isLoading} className="w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                {isLoading ? 'Proses...' : 'Tambah Pengguna'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="bg-white/80 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle>Daftar Pengguna</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length > 0 ? (
              <div className="space-y-4">
                {users.map((userItem) => (
                  <div key={userItem.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">
                        {userItem.username || userItem.nip || userItem.nisn}
                      </p>
                      <p className="text-sm text-gray-600 capitalize">{userItem.role}</p>
                      <p className="text-xs text-gray-500">
                        Dibuat: {userItem.created_at.toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {/* TODO: Edit user */}}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(userItem.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Tidak ada pengguna</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentPage === 'classes') {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Kelola Kelas</h1>
        
        {/* Create Class Form */}
        <Card className="bg-white/80 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle>Tambah Kelas Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Kelas</label>
                  <Input
                    value={newClass.nama_kelas}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setNewClass(prev => ({ ...prev, nama_kelas: e.target.value }))
                    }
                    placeholder="Contoh: X-1, XI IPA 1"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Wali Kelas</label>
                  <Select 
                    value={newClass.wali_kelas_id.toString()} 
                    onValueChange={(value) => 
                      setNewClass(prev => ({ ...prev, wali_kelas_id: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih wali kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
                          {teacher.nama} ({teacher.nip})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button type="submit" disabled={isLoading} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {isLoading ? 'Proses...' : 'Tambah Kelas'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Classes List */}
        <Card className="bg-white/80 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle>Daftar Kelas</CardTitle>
          </CardHeader>
          <CardContent>
            {classes.length > 0 ? (
              <div className="space-y-4">
                {classes.map((kelas) => {
                  const waliKelas = teachers.find(t => t.id === kelas.wali_kelas_id);
                  return (
                    <div key={kelas.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <p className="font-medium">{kelas.nama_kelas}</p>
                        <p className="text-sm text-gray-600">
                          Wali Kelas: {waliKelas?.nama || 'Tidak ditemukan'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Dibuat: {kelas.created_at.toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {/* TODO: View class details */}}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {/* TODO: Edit class */}}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {/* TODO: Delete class */}}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <School className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Tidak ada kelas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentPage === 'profile') {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Profil Administrator</h1>
        
        <Card className="bg-white/80 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle>Informasi Pribadi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Username</label>
                  <p className="text-lg font-medium">{user.username || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Role</label>
                  <p className="text-lg font-medium">Administrator</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <div>Page not found</div>;
}