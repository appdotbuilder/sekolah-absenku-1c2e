// STUB IMPLEMENTATION - This provides demo data for development
// In production, this should be replaced with proper tRPC calls

import type { 
  Absensi, 
  PengajuanIzin, 
  Siswa, 
  Guru, 
  Kelas, 
  User,
  DashboardStats,
  CreatePengajuanIzinInput,
  ReviewPengajuanIzinInput
} from '../../../../server/src/schema';

// Demo data
let demoAbsensi: Absensi[] = [
  {
    id: 1,
    siswa_id: 1,
    guru_id: 1,
    kelas_id: 1,
    status: 'hadir',
    tanggal: new Date(),
    waktu_masuk: '07:30',
    waktu_pulang: null,
    keterangan: null,
    created_at: new Date(),
    updated_at: new Date()
  }
];

let demoPengajuanIzin: PengajuanIzin[] = [
  {
    id: 1,
    siswa_id: 1,
    tanggal: new Date(Date.now() + 86400000), // tomorrow
    alasan: 'Sakit demam',
    status: 'pending',
    jenis: 'sakit',
    reviewer_id: null,
    reviewed_at: null,
    created_at: new Date(),
    updated_at: new Date()
  }
];

let demoSiswa: Siswa[] = [
  {
    id: 1,
    user_id: 3,
    nisn: '1234567890',
    nama: 'Ahmad Fajar',
    kelas_id: 1,
    foto: null,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 2,
    user_id: 4,
    nisn: '1234567891',
    nama: 'Siti Nurhaliza',
    kelas_id: 1,
    foto: null,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 3,
    user_id: 5,
    nisn: '1234567892',
    nama: 'Budi Setiawan',
    kelas_id: 1,
    foto: null,
    created_at: new Date(),
    updated_at: new Date()
  }
];

let demoGuru: Guru[] = [
  {
    id: 1,
    user_id: 2,
    nip: '1987654321',
    nama: 'Budi Santoso',
    foto: null,
    created_at: new Date(),
    updated_at: new Date()
  }
];

let demoKelas: Kelas[] = [
  {
    id: 1,
    nama_kelas: 'X-1',
    wali_kelas_id: 1,
    created_at: new Date(),
    updated_at: new Date()
  }
];

let demoUsers: User[] = [
  {
    id: 1,
    username: 'admin',
    nip: null,
    nisn: null,
    password_hash: 'hashed_admin123',
    role: 'admin',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 2,
    username: null,
    nip: '1987654321',
    nisn: null,
    password_hash: 'hashed_guru123',
    role: 'guru',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 3,
    username: null,
    nip: null,
    nisn: '1234567890',
    password_hash: 'hashed_siswa123',
    role: 'siswa',
    created_at: new Date(),
    updated_at: new Date()
  }
];

// Stub service functions
export const StubDataService = {
  // Attendance services
  getTodayAbsensi: async (params: { siswaId?: number; kelasId?: number }): Promise<Absensi[]> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    
    const today = new Date().toDateString();
    let result = demoAbsensi.filter(a => a.tanggal.toDateString() === today);
    
    if (params.siswaId) {
      result = result.filter(a => a.siswa_id === params.siswaId);
    }
    if (params.kelasId) {
      result = result.filter(a => a.kelas_id === params.kelasId);
    }
    
    return result;
  },

  getAbsensiHistory: async (params: { siswa_id?: number; limit?: number }): Promise<Absensi[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let result = [...demoAbsensi];
    if (params.siswa_id) {
      result = result.filter(a => a.siswa_id === params.siswa_id);
    }
    
    return result.slice(0, params.limit || 50);
  },

  absenMasuk: async (input: { siswa_id: number }): Promise<Absensi> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newAbsensi: Absensi = {
      id: demoAbsensi.length + 1,
      siswa_id: input.siswa_id,
      guru_id: null,
      kelas_id: 1, // Default kelas
      status: 'hadir',
      tanggal: new Date(),
      waktu_masuk: new Date().toLocaleTimeString('id-ID'),
      waktu_pulang: null,
      keterangan: null,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Remove existing today attendance for this student
    demoAbsensi = demoAbsensi.filter(a => 
      !(a.siswa_id === input.siswa_id && a.tanggal.toDateString() === new Date().toDateString())
    );
    
    demoAbsensi.push(newAbsensi);
    return newAbsensi;
  },

  absenPulang: async (input: { siswa_id: number }): Promise<Absensi> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const todayAttendance = demoAbsensi.find(a => 
      a.siswa_id === input.siswa_id && a.tanggal.toDateString() === new Date().toDateString()
    );
    
    if (todayAttendance) {
      todayAttendance.waktu_pulang = new Date().toLocaleTimeString('id-ID');
      todayAttendance.updated_at = new Date();
      return todayAttendance;
    } else {
      throw new Error('No check-in record found for today');
    }
  },

  createAbsensi: async (input: any): Promise<Absensi> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newAbsensi: Absensi = {
      id: demoAbsensi.length + 1,
      ...input,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    demoAbsensi.push(newAbsensi);
    return newAbsensi;
  },

  // Leave request services
  getPengajuanIzinBySiswa: async (params: { siswaId: number }): Promise<PengajuanIzin[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return demoPengajuanIzin.filter(p => p.siswa_id === params.siswaId);
  },

  getPendingPengajuanIzin: async (params: { kelasId?: number }): Promise<PengajuanIzin[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return demoPengajuanIzin.filter(p => p.status === 'pending');
  },

  createPengajuanIzin: async (input: CreatePengajuanIzinInput): Promise<PengajuanIzin> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newRequest: PengajuanIzin = {
      id: demoPengajuanIzin.length + 1,
      ...input,
      status: 'pending',
      reviewer_id: null,
      reviewed_at: null,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    demoPengajuanIzin.push(newRequest);
    return newRequest;
  },

  reviewPengajuanIzin: async (input: ReviewPengajuanIzinInput): Promise<PengajuanIzin> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const request = demoPengajuanIzin.find(p => p.id === input.id);
    if (!request) {
      throw new Error('Request not found');
    }
    
    request.status = input.status;
    request.reviewer_id = input.reviewer_id;
    request.reviewed_at = new Date();
    request.updated_at = new Date();
    
    return request;
  },

  // Student services
  getAllSiswa: async (): Promise<Siswa[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...demoSiswa];
  },

  getSiswaByKelas: async (params: { kelasId: number }): Promise<Siswa[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return demoSiswa.filter(s => s.kelas_id === params.kelasId);
  },

  // Teacher services
  getAllGuru: async (): Promise<Guru[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...demoGuru];
  },

  getKelasByWaliKelas: async (params: { guruId: number }): Promise<Kelas[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return demoKelas.filter(k => k.wali_kelas_id === params.guruId);
  },

  // Class services
  getAllKelas: async (): Promise<Kelas[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...demoKelas];
  },

  // User services
  getAllUsers: async (): Promise<User[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...demoUsers];
  },

  createUser: async (input: any): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newUser: User = {
      id: demoUsers.length + 1,
      ...input,
      password_hash: `hashed_${input.password}`,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    demoUsers.push(newUser);
    return newUser;
  },

  deleteUser: async (params: { id: number }): Promise<{ success: boolean }> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const index = demoUsers.findIndex(u => u.id === params.id);
    if (index > -1) {
      demoUsers.splice(index, 1);
      return { success: true };
    }
    return { success: false };
  },

  createKelas: async (input: any): Promise<Kelas> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newKelas: Kelas = {
      id: demoKelas.length + 1,
      ...input,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    demoKelas.push(newKelas);
    return newKelas;
  },

  // Dashboard services
  getDashboardStats: async (): Promise<DashboardStats> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const today = new Date().toDateString();
    const todayAttendance = demoAbsensi.filter(a => a.tanggal.toDateString() === today);
    
    return {
      total_siswa: demoSiswa.length,
      total_guru: demoGuru.length,
      total_kelas: demoKelas.length,
      absensi_hari_ini: {
        hadir: todayAttendance.filter(a => a.status === 'hadir').length,
        izin: todayAttendance.filter(a => a.status === 'izin').length,
        sakit: todayAttendance.filter(a => a.status === 'sakit').length,
        alpha: todayAttendance.filter(a => a.status === 'alpha').length,
      },
      pengajuan_pending: demoPengajuanIzin.filter(p => p.status === 'pending').length
    };
  }
};