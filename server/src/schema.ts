import { z } from 'zod';

// Enums
export const roleEnum = z.enum(['admin', 'guru', 'siswa']);
export const attendanceStatusEnum = z.enum(['hadir', 'izin', 'sakit', 'alpha']);
export const requestStatusEnum = z.enum(['pending', 'approved', 'rejected']);

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string().nullable(), // For admin
  nip: z.string().nullable(), // For guru
  nisn: z.string().nullable(), // For siswa
  password_hash: z.string(),
  role: roleEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Siswa schema
export const siswaSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  nisn: z.string(),
  nama: z.string(),
  kelas_id: z.number(),
  foto: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Siswa = z.infer<typeof siswaSchema>;

// Guru schema
export const guruSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  nip: z.string(),
  nama: z.string(),
  foto: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Guru = z.infer<typeof guruSchema>;

// Kelas schema
export const kelasSchema = z.object({
  id: z.number(),
  nama_kelas: z.string(),
  wali_kelas_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Kelas = z.infer<typeof kelasSchema>;

// Absensi schema
export const absensiSchema = z.object({
  id: z.number(),
  siswa_id: z.number(),
  guru_id: z.number().nullable(),
  kelas_id: z.number(),
  status: attendanceStatusEnum,
  tanggal: z.coerce.date(),
  waktu_masuk: z.string().nullable(),
  waktu_pulang: z.string().nullable(),
  keterangan: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Absensi = z.infer<typeof absensiSchema>;

// Pengajuan Izin schema
export const pengajuanIzinSchema = z.object({
  id: z.number(),
  siswa_id: z.number(),
  tanggal: z.coerce.date(),
  alasan: z.string(),
  status: requestStatusEnum,
  jenis: z.enum(['izin', 'sakit']),
  reviewer_id: z.number().nullable(),
  reviewed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PengajuanIzin = z.infer<typeof pengajuanIzinSchema>;

// Login input schemas
export const loginInputSchema = z.object({
  role: roleEnum,
  username: z.string().optional(),
  nip: z.string().optional(),
  nisn: z.string().optional(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Create user input schema
export const createUserInputSchema = z.object({
  username: z.string().nullable(),
  nip: z.string().nullable(),
  nisn: z.string().nullable(),
  password: z.string(),
  role: roleEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Update user input schema
export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().nullable().optional(),
  nip: z.string().nullable().optional(),
  nisn: z.string().nullable().optional(),
  password: z.string().optional(),
  role: roleEnum.optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Create siswa input schema
export const createSiswaInputSchema = z.object({
  user_id: z.number(),
  nisn: z.string(),
  nama: z.string(),
  kelas_id: z.number(),
  foto: z.string().nullable()
});

export type CreateSiswaInput = z.infer<typeof createSiswaInputSchema>;

// Update siswa input schema
export const updateSiswaInputSchema = z.object({
  id: z.number(),
  nama: z.string().optional(),
  kelas_id: z.number().optional(),
  foto: z.string().nullable().optional()
});

export type UpdateSiswaInput = z.infer<typeof updateSiswaInputSchema>;

// Create guru input schema
export const createGuruInputSchema = z.object({
  user_id: z.number(),
  nip: z.string(),
  nama: z.string(),
  foto: z.string().nullable()
});

export type CreateGuruInput = z.infer<typeof createGuruInputSchema>;

// Update guru input schema
export const updateGuruInputSchema = z.object({
  id: z.number(),
  nama: z.string().optional(),
  foto: z.string().nullable().optional()
});

export type UpdateGuruInput = z.infer<typeof updateGuruInputSchema>;

// Create kelas input schema
export const createKelasInputSchema = z.object({
  nama_kelas: z.string(),
  wali_kelas_id: z.number()
});

export type CreateKelasInput = z.infer<typeof createKelasInputSchema>;

// Update kelas input schema
export const updateKelasInputSchema = z.object({
  id: z.number(),
  nama_kelas: z.string().optional(),
  wali_kelas_id: z.number().optional()
});

export type UpdateKelasInput = z.infer<typeof updateKelasInputSchema>;

// Create absensi input schema
export const createAbsensiInputSchema = z.object({
  siswa_id: z.number(),
  guru_id: z.number().nullable(),
  kelas_id: z.number(),
  status: attendanceStatusEnum,
  tanggal: z.coerce.date(),
  waktu_masuk: z.string().nullable(),
  waktu_pulang: z.string().nullable(),
  keterangan: z.string().nullable()
});

export type CreateAbsensiInput = z.infer<typeof createAbsensiInputSchema>;

// Update absensi input schema
export const updateAbsensiInputSchema = z.object({
  id: z.number(),
  status: attendanceStatusEnum.optional(),
  waktu_masuk: z.string().nullable().optional(),
  waktu_pulang: z.string().nullable().optional(),
  keterangan: z.string().nullable().optional()
});

export type UpdateAbsensiInput = z.infer<typeof updateAbsensiInputSchema>;

// Absen masuk/pulang input schema
export const absenMasukInputSchema = z.object({
  siswa_id: z.number()
});

export type AbsenMasukInput = z.infer<typeof absenMasukInputSchema>;

export const absenPulangInputSchema = z.object({
  siswa_id: z.number()
});

export type AbsenPulangInput = z.infer<typeof absenPulangInputSchema>;

// Create pengajuan izin input schema
export const createPengajuanIzinInputSchema = z.object({
  siswa_id: z.number(),
  tanggal: z.coerce.date(),
  alasan: z.string(),
  jenis: z.enum(['izin', 'sakit'])
});

export type CreatePengajuanIzinInput = z.infer<typeof createPengajuanIzinInputSchema>;

// Review pengajuan izin input schema
export const reviewPengajuanIzinInputSchema = z.object({
  id: z.number(),
  status: z.enum(['approved', 'rejected']),
  reviewer_id: z.number()
});

export type ReviewPengajuanIzinInput = z.infer<typeof reviewPengajuanIzinInputSchema>;

// Get absensi history input schema
export const getAbsensiHistoryInputSchema = z.object({
  siswa_id: z.number().optional(),
  kelas_id: z.number().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  limit: z.number().default(50),
  offset: z.number().default(0)
});

export type GetAbsensiHistoryInput = z.infer<typeof getAbsensiHistoryInputSchema>;

// Dashboard statistics schema
export const dashboardStatsSchema = z.object({
  total_siswa: z.number(),
  total_guru: z.number(),
  total_kelas: z.number(),
  absensi_hari_ini: z.object({
    hadir: z.number(),
    izin: z.number(),
    sakit: z.number(),
    alpha: z.number()
  }),
  pengajuan_pending: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Authentication response schema
export const authResponseSchema = z.object({
  success: z.boolean(),
  user: z.object({
    id: z.number(),
    role: roleEnum,
    username: z.string().nullable(),
    nip: z.string().nullable(),
    nisn: z.string().nullable(),
    profile: z.object({
      id: z.number(),
      nama: z.string(),
      foto: z.string().nullable(),
      kelas_id: z.number().optional() // Only for siswa
    }).nullable()
  }).nullable(),
  message: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;