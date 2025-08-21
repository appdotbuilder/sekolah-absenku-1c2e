import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import { StubDataService } from '../services/StubDataService';
import { 
  Clock, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  FileText,
  LogIn,
  LogOut,
  Plus
} from 'lucide-react';
import type { AuthResponse, Absensi, PengajuanIzin } from '../../../../server/src/schema';

interface SiswaDashboardProps {
  user: NonNullable<AuthResponse['user']>;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function SiswaDashboard({ user, currentPage, onPageChange }: SiswaDashboardProps) {
  const [todayAttendance, setTodayAttendance] = useState<Absensi | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<Absensi[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<PengajuanIzin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newLeaveRequest, setNewLeaveRequest] = useState({
    tanggal: '',
    alasan: '',
    jenis: 'izin' as 'izin' | 'sakit'
  });

  const siswaId = user.profile?.id;

  // Load today's attendance
  const loadTodayAttendance = useCallback(async () => {
    if (!siswaId) return;
    
    try {
      // STUB: Using mock data service for demo
      const result = await StubDataService.getTodayAbsensi({ siswaId });
      setTodayAttendance(result[0] || null);
    } catch (error) {
      console.error('Failed to load today attendance:', error);
    }
  }, [siswaId]);

  // Load attendance history
  const loadAttendanceHistory = useCallback(async () => {
    if (!siswaId) return;
    
    try {
      // STUB: Using mock data service for demo
      const result = await StubDataService.getAbsensiHistory({ 
        siswa_id: siswaId,
        limit: 30
      });
      setAttendanceHistory(result);
    } catch (error) {
      console.error('Failed to load attendance history:', error);
    }
  }, [siswaId]);

  // Load leave requests
  const loadLeaveRequests = useCallback(async () => {
    if (!siswaId) return;
    
    try {
      // STUB: Using mock data service for demo
      const result = await StubDataService.getPengajuanIzinBySiswa({ siswaId });
      setLeaveRequests(result);
    } catch (error) {
      console.error('Failed to load leave requests:', error);
    }
  }, [siswaId]);

  useEffect(() => {
    if (currentPage === 'dashboard' || currentPage === 'attendance') {
      loadTodayAttendance();
    }
    if (currentPage === 'dashboard' || currentPage === 'history') {
      loadAttendanceHistory();
    }
    if (currentPage === 'dashboard' || currentPage === 'leave-request') {
      loadLeaveRequests();
    }
  }, [currentPage, loadTodayAttendance, loadAttendanceHistory, loadLeaveRequests]);

  // Handle attendance check-in
  const handleAbsenMasuk = async () => {
    if (!siswaId) return;
    
    setIsLoading(true);
    try {
      // STUB: Using mock data service for demo
      await StubDataService.absenMasuk({ siswa_id: siswaId });
      await loadTodayAttendance();
    } catch (error) {
      console.error('Failed to check in:', error);
      alert('Gagal melakukan absen masuk');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle attendance check-out
  const handleAbsenPulang = async () => {
    if (!siswaId) return;
    
    setIsLoading(true);
    try {
      // STUB: Using mock data service for demo
      await StubDataService.absenPulang({ siswa_id: siswaId });
      await loadTodayAttendance();
    } catch (error) {
      console.error('Failed to check out:', error);
      alert('Gagal melakukan absen pulang');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle leave request submission
  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siswaId) return;
    
    setIsLoading(true);
    try {
      // STUB: Using mock data service for demo
      await StubDataService.createPengajuanIzin({
        siswa_id: siswaId,
        tanggal: new Date(newLeaveRequest.tanggal),
        alasan: newLeaveRequest.alasan,
        jenis: newLeaveRequest.jenis
      });
      
      setNewLeaveRequest({ tanggal: '', alasan: '', jenis: 'izin' });
      await loadLeaveRequests();
      alert('Pengajuan izin berhasil disubmit');
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      alert('Gagal mengajukan izin');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hadir': return 'text-green-600 bg-green-100';
      case 'izin': return 'text-blue-600 bg-blue-100';
      case 'sakit': return 'text-yellow-600 bg-yellow-100';
      case 'alpha': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRequestStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (currentPage === 'dashboard') {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Dashboard Siswa</h1>
          <p className="text-blue-100">Selamat datang, {user.profile?.nama}!</p>
          <p className="text-sm text-blue-200">NISN: {user.nisn}</p>
        </div>

        {/* Today's Attendance */}
        <Card className="bg-white/80 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Absensi Hari Ini</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAttendance ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium">Status: 
                      <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(todayAttendance.status)}`}>
                        {todayAttendance.status.toUpperCase()}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Tanggal: {todayAttendance.tanggal.toLocaleDateString('id-ID')}
                    </p>
                    {todayAttendance.waktu_masuk && (
                      <p className="text-sm text-gray-600">
                        Masuk: {todayAttendance.waktu_masuk}
                      </p>
                    )}
                    {todayAttendance.waktu_pulang && (
                      <p className="text-sm text-gray-600">
                        Pulang: {todayAttendance.waktu_pulang}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  {!todayAttendance.waktu_masuk && (
                    <Button 
                      onClick={handleAbsenMasuk}
                      disabled={isLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      {isLoading ? 'Proses...' : 'Absen Masuk'}
                    </Button>
                  )}
                  
                  {todayAttendance.waktu_masuk && !todayAttendance.waktu_pulang && (
                    <Button 
                      onClick={handleAbsenPulang}
                      disabled={isLoading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {isLoading ? 'Proses...' : 'Absen Pulang'}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Belum ada absensi hari ini</p>
                <Button 
                  onClick={handleAbsenMasuk}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {isLoading ? 'Proses...' : 'Absen Masuk'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Button 
            onClick={() => onPageChange('attendance')}
            variant="outline"
            className="h-24 flex-col space-y-2 bg-white/80 backdrop-blur-md border-white/20"
          >
            <Clock className="w-8 h-8 text-blue-600" />
            <span>Absensi</span>
          </Button>
          
          <Button 
            onClick={() => onPageChange('history')}
            variant="outline"
            className="h-24 flex-col space-y-2 bg-white/80 backdrop-blur-md border-white/20"
          >
            <Calendar className="w-8 h-8 text-purple-600" />
            <span>Riwayat</span>
          </Button>
          
          <Button 
            onClick={() => onPageChange('leave-request')}
            variant="outline"
            className="h-24 flex-col space-y-2 bg-white/80 backdrop-blur-md border-white/20"
          >
            <FileText className="w-8 h-8 text-orange-600" />
            <span>Pengajuan Izin</span>
          </Button>
        </div>
      </div>
    );
  }

  if (currentPage === 'attendance') {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Absensi</h1>
        
        <Card className="bg-white/80 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle>Absensi Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            {todayAttendance ? (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-gray-50">
                    <h3 className="font-medium mb-2">Status</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(todayAttendance.status)}`}>
                      {todayAttendance.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-gray-50">
                    <h3 className="font-medium mb-2">Tanggal</h3>
                    <p>{todayAttendance.tanggal.toLocaleDateString('id-ID')}</p>
                  </div>
                  
                  {todayAttendance.waktu_masuk && (
                    <div className="p-4 rounded-lg bg-gray-50">
                      <h3 className="font-medium mb-2">Waktu Masuk</h3>
                      <p>{todayAttendance.waktu_masuk}</p>
                    </div>
                  )}
                  
                  {todayAttendance.waktu_pulang && (
                    <div className="p-4 rounded-lg bg-gray-50">
                      <h3 className="font-medium mb-2">Waktu Pulang</h3>
                      <p>{todayAttendance.waktu_pulang}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-4">
                  {!todayAttendance.waktu_masuk && (
                    <Button 
                      onClick={handleAbsenMasuk}
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      {isLoading ? 'Proses...' : 'Absen Masuk'}
                    </Button>
                  )}
                  
                  {todayAttendance.waktu_masuk && !todayAttendance.waktu_pulang && (
                    <Button 
                      onClick={handleAbsenPulang}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {isLoading ? 'Proses...' : 'Absen Pulang'}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Belum ada absensi hari ini</p>
                <Button 
                  onClick={handleAbsenMasuk}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {isLoading ? 'Proses...' : 'Absen Masuk'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentPage === 'history') {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Riwayat Absensi</h1>
        
        <Card className="bg-white/80 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle>30 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceHistory.length > 0 ? (
              <div className="space-y-4">
                {attendanceHistory.map((attendance: Absensi) => (
                  <div key={attendance.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">{attendance.tanggal.toLocaleDateString('id-ID')}</p>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        {attendance.waktu_masuk && <span>Masuk: {attendance.waktu_masuk}</span>}
                        {attendance.waktu_pulang && <span>Pulang: {attendance.waktu_pulang}</span>}
                      </div>
                      {attendance.keterangan && (
                        <p className="text-sm text-gray-600 mt-1">{attendance.keterangan}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(attendance.status)}`}>
                      {attendance.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Belum ada riwayat absensi</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentPage === 'leave-request') {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Pengajuan Izin</h1>
        
        {/* Form Pengajuan Baru */}
        <Card className="bg-white/80 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle>Ajukan Izin Baru</CardTitle>
            <CardDescription>Isi form di bawah untuk mengajukan izin tidak masuk</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitLeaveRequest} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal</label>
                  <Input
                    type="date"
                    value={newLeaveRequest.tanggal}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setNewLeaveRequest(prev => ({ ...prev, tanggal: e.target.value }))
                    }
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jenis</label>
                  <Select 
                    value={newLeaveRequest.jenis} 
                    onValueChange={(value: 'izin' | 'sakit') => 
                      setNewLeaveRequest(prev => ({ ...prev, jenis: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="izin">Izin</SelectItem>
                      <SelectItem value="sakit">Sakit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Alasan</label>
                <Input
                  value={newLeaveRequest.alasan}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setNewLeaveRequest(prev => ({ ...prev, alasan: e.target.value }))
                  }
                  placeholder="Masukkan alasan izin..."
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {isLoading ? 'Proses...' : 'Ajukan Izin'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Riwayat Pengajuan */}
        <Card className="bg-white/80 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle>Riwayat Pengajuan</CardTitle>
          </CardHeader>
          <CardContent>
            {leaveRequests.length > 0 ? (
              <div className="space-y-4">
                {leaveRequests.map((request: PengajuanIzin) => (
                  <div key={request.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">{request.tanggal.toLocaleDateString('id-ID')}</p>
                      <p className="text-sm text-gray-600">{request.jenis.toUpperCase()}: {request.alasan}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Diajukan: {request.created_at.toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRequestStatusColor(request.status)}`}>
                        {request.status === 'pending' ? 'MENUNGGU' : 
                         request.status === 'approved' ? 'DISETUJUI' : 'DITOLAK'}
                      </span>
                      {request.reviewed_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Diproses: {request.reviewed_at.toLocaleDateString('id-ID')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Belum ada pengajuan izin</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Profile page
  if (currentPage === 'profile') {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Profil Siswa</h1>
        
        <Card className="bg-white/80 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle>Informasi Pribadi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nama</label>
                  <p className="text-lg font-medium">{user.profile?.nama || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">NISN</label>
                  <p className="text-lg font-medium">{user.nisn || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Role</label>
                  <p className="text-lg font-medium">Siswa</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">ID Kelas</label>
                  <p className="text-lg font-medium">{user.profile?.kelas_id || '-'}</p>
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