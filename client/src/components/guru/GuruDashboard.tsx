import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import { StubDataService } from '../services/StubDataService';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  FileText,
  Clock,
  School,
  BookOpen,
  UserCheck,
  Download
} from 'lucide-react';
import type { AuthResponse, Siswa, Kelas, Absensi, PengajuanIzin } from '../../../../server/src/schema';

interface GuruDashboardProps {
  user: NonNullable<AuthResponse['user']>;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function GuruDashboard({ user, currentPage, onPageChange }: GuruDashboardProps) {
  const [myClasses, setMyClasses] = useState<Kelas[]>([]);
  const [students, setStudents] = useState<Siswa[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Absensi[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PengajuanIzin[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const guruId = user.profile?.id;

  // Load my classes
  const loadMyClasses = useCallback(async () => {
    if (!guruId) return;
    
    try {
      // STUB: Using mock data service for demo
      const result = await StubDataService.getKelasByWaliKelas({ guruId });
      setMyClasses(result);
      if (result.length > 0 && !selectedClass) {
        setSelectedClass(result[0].id);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
  }, [guruId, selectedClass]);

  // Load students by class
  const loadStudents = useCallback(async () => {
    if (!selectedClass) return;
    
    try {
      // STUB: Using mock data service for demo
      const result = await StubDataService.getSiswaByKelas({ kelasId: selectedClass });
      setStudents(result);
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  }, [selectedClass]);

  // Load today's attendance
  const loadTodayAttendance = useCallback(async () => {
    if (!selectedClass) return;
    
    try {
      // STUB: Using mock data service for demo
      const result = await StubDataService.getTodayAbsensi({ kelasId: selectedClass });
      setTodayAttendance(result);
    } catch (error) {
      console.error('Failed to load today attendance:', error);
    }
  }, [selectedClass]);

  // Load pending leave requests
  const loadPendingRequests = useCallback(async () => {
    if (!selectedClass) return;
    
    try {
      // STUB: Using mock data service for demo
      const result = await StubDataService.getPendingPengajuanIzin({ kelasId: selectedClass });
      setPendingRequests(result);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    }
  }, [selectedClass]);

  useEffect(() => {
    loadMyClasses();
  }, [loadMyClasses]);

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
      loadTodayAttendance();
      loadPendingRequests();
    }
  }, [selectedClass, loadStudents, loadTodayAttendance, loadPendingRequests]);

  // Handle manual attendance input
  const handleManualAttendance = async (siswaId: number, status: 'hadir' | 'izin' | 'sakit' | 'alpha') => {
    if (!selectedClass || !guruId) return;

    setIsLoading(true);
    try {
      // STUB: Using mock data service for demo
      await StubDataService.createAbsensi({
        siswa_id: siswaId,
        guru_id: guruId,
        kelas_id: selectedClass,
        status,
        tanggal: new Date(),
        waktu_masuk: status === 'hadir' ? new Date().toLocaleTimeString('id-ID') : null,
        waktu_pulang: null,
        keterangan: null
      });
      
      await loadTodayAttendance();
      alert('Absensi berhasil dicatat');
    } catch (error) {
      console.error('Failed to record attendance:', error);
      alert('Gagal mencatat absensi');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle leave request review
  const handleReviewRequest = async (requestId: number, status: 'approved' | 'rejected') => {
    if (!guruId) return;

    setIsLoading(true);
    try {
      // STUB: Using mock data service for demo
      await StubDataService.reviewPengajuanIzin({
        id: requestId,
        status,
        reviewer_id: guruId
      });
      
      await loadPendingRequests();
      alert(`Pengajuan berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`);
    } catch (error) {
      console.error('Failed to review request:', error);
      alert('Gagal memproses pengajuan');
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

  const getAttendanceStats = () => {
    const total = students.length;
    const hadir = todayAttendance.filter(a => a.status === 'hadir').length;
    const izin = todayAttendance.filter(a => a.status === 'izin').length;
    const sakit = todayAttendance.filter(a => a.status === 'sakit').length;
    const alpha = total - todayAttendance.length;
    
    return { total, hadir, izin, sakit, alpha };
  };

  if (currentPage === 'dashboard') {
    const stats = getAttendanceStats();
    
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Dashboard Guru</h1>
          <p className="text-blue-100">Selamat datang, {user.profile?.nama}!</p>
          <p className="text-sm text-blue-200">NIP: {user.nip}</p>
        </div>

        {/* Class Selection */}
        {myClasses.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle>Pilih Kelas</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedClass?.toString()} 
                onValueChange={(value) => setSelectedClass(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {myClasses.map((kelas) => (
                    <SelectItem key={kelas.id} value={kelas.id.toString()}>
                      {kelas.nama_kelas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {selectedClass && (
          <>
            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-white/80 backdrop-blur-md border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-green-100">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{stats.hadir}</p>
                      <p className="text-sm text-gray-600">Hadir</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-md border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-blue-100">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{stats.izin}</p>
                      <p className="text-sm text-gray-600">Izin</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-md border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-yellow-100">
                      <AlertCircle className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">{stats.sakit}</p>
                      <p className="text-sm text-gray-600">Sakit</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-md border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-red-100">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{stats.alpha}</p>
                      <p className="text-sm text-gray-600">Alpha</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Leave Requests */}
            {pendingRequests.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Pengajuan Izin Menunggu</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingRequests.slice(0, 3).map((request) => {
                      const student = students.find(s => s.id === request.siswa_id);
                      return (
                        <div key={request.id} className="flex items-center justify-between p-4 rounded-lg border">
                          <div>
                            <p className="font-medium">{student?.nama || 'Unknown'}</p>
                            <p className="text-sm text-gray-600">
                              {request.jenis.toUpperCase()}: {request.alasan}
                            </p>
                            <p className="text-xs text-gray-500">
                              Tanggal: {request.tanggal.toLocaleDateString('id-ID')}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleReviewRequest(request.id, 'approved')}
                              className="bg-green-600 hover:bg-green-700"
                              disabled={isLoading}
                            >
                              Setuju
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReviewRequest(request.id, 'rejected')}
                              disabled={isLoading}
                            >
                              Tolak
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="grid md:grid-cols-4 gap-4">
              <Button 
                onClick={() => onPageChange('my-class')}
                variant="outline"
                className="h-24 flex-col space-y-2 bg-white/80 backdrop-blur-md border-white/20"
              >
                <School className="w-8 h-8 text-blue-600" />
                <span>Kelas Saya</span>
              </Button>
              
              <Button 
                onClick={() => onPageChange('attendance')}
                variant="outline"
                className="h-24 flex-col space-y-2 bg-white/80 backdrop-blur-md border-white/20"
              >
                <UserCheck className="w-8 h-8 text-green-600" />
                <span>Absensi</span>
              </Button>
              
              <Button 
                onClick={() => onPageChange('leave-requests')}
                variant="outline"
                className="h-24 flex-col space-y-2 bg-white/80 backdrop-blur-md border-white/20"
              >
                <FileText className="w-8 h-8 text-orange-600" />
                <span>Pengajuan Izin</span>
              </Button>
              
              <Button 
                onClick={() => onPageChange('reports')}
                variant="outline"
                className="h-24 flex-col space-y-2 bg-white/80 backdrop-blur-md border-white/20"
              >
                <Download className="w-8 h-8 text-purple-600" />
                <span>Laporan</span>
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (currentPage === 'my-class') {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Kelas Saya</h1>
        
        {selectedClass && (
          <Card className="bg-white/80 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle>Daftar Siswa</CardTitle>
              <CardDescription>
                Kelas: {myClasses.find(k => k.id === selectedClass)?.nama_kelas}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {students.length > 0 ? (
                <div className="space-y-4">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {student.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{student.nama}</p>
                          <p className="text-sm text-gray-600">NISN: {student.nisn}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {todayAttendance.find(a => a.siswa_id === student.id) ? (
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            getStatusColor(todayAttendance.find(a => a.siswa_id === student.id)!.status)
                          }`}>
                            {todayAttendance.find(a => a.siswa_id === student.id)!.status.toUpperCase()}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-sm font-medium text-gray-600 bg-gray-100">
                            BELUM ABSEN
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Tidak ada siswa di kelas ini</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (currentPage === 'attendance-input') {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Input Absensi Manual</h1>
        
        {selectedClass && (
          <Card className="bg-white/80 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle>Input Absensi Siswa</CardTitle>
              <CardDescription>
                Kelas: {myClasses.find(k => k.id === selectedClass)?.nama_kelas} - {new Date().toLocaleDateString('id-ID')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {students.length > 0 ? (
                <div className="space-y-4">
                  {students.map((student) => {
                    const attendance = todayAttendance.find(a => a.siswa_id === student.id);
                    return (
                      <div key={student.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {student.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{student.nama}</p>
                            <p className="text-sm text-gray-600">NISN: {student.nisn}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {attendance ? (
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(attendance.status)}`}>
                              {attendance.status.toUpperCase()}
                            </span>
                          ) : (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleManualAttendance(student.id, 'hadir')}
                                className="bg-green-600 hover:bg-green-700"
                                disabled={isLoading}
                              >
                                Hadir
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleManualAttendance(student.id, 'izin')}
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={isLoading}
                              >
                                Izin
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleManualAttendance(student.id, 'sakit')}
                                className="bg-yellow-600 hover:bg-yellow-700"
                                disabled={isLoading}
                              >
                                Sakit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleManualAttendance(student.id, 'alpha')}
                                disabled={isLoading}
                              >
                                Alpha
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Tidak ada siswa di kelas ini</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (currentPage === 'leave-requests') {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Pengajuan Izin</h1>
        
        <Card className="bg-white/80 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle>Pengajuan Menunggu Persetujuan</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequests.length > 0 ? (
              <div className="space-y-4">
                {pendingRequests.map((request) => {
                  const student = students.find(s => s.id === request.siswa_id);
                  return (
                    <div key={request.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <p className="font-medium">{student?.nama || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">
                          {request.jenis.toUpperCase()}: {request.alasan}
                        </p>
                        <p className="text-xs text-gray-500">
                          Tanggal: {request.tanggal.toLocaleDateString('id-ID')}
                        </p>
                        <p className="text-xs text-gray-500">
                          Diajukan: {request.created_at.toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleReviewRequest(request.id, 'approved')}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={isLoading}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Setuju
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReviewRequest(request.id, 'rejected')}
                          disabled={isLoading}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Tolak
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Tidak ada pengajuan izin yang menunggu</p>
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
        <h1 className="text-2xl font-bold text-gray-800">Profil Guru</h1>
        
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
                  <label className="text-sm font-medium text-gray-600">NIP</label>
                  <p className="text-lg font-medium">{user.nip || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Role</label>
                  <p className="text-lg font-medium">Guru</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Kelas Wali</label>
                  <p className="text-lg font-medium">
                    {myClasses.map(k => k.nama_kelas).join(', ') || '-'}
                  </p>
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