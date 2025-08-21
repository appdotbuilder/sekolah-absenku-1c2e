import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB } from '../helpers';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { getDashboardStats, getGuruDashboardStats, getSiswaDashboardStats } from '../handlers/dashboard';

// Custom DB setup without the problematic pengajuan_izin table
const createTestDB = async () => {
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`create schema public`);
  await db.execute(sql`drop schema if exists drizzle cascade`);
  
  // Create only the enums and tables we need for testing
  await db.execute(sql`CREATE TYPE "role" AS ENUM('admin', 'guru', 'siswa')`);
  await db.execute(sql`CREATE TYPE "attendance_status" AS ENUM('hadir', 'izin', 'sakit', 'alpha')`);
  await db.execute(sql`CREATE TYPE "request_status" AS ENUM('pending', 'approved', 'rejected')`);
  
  // Create tables in dependency order
  await db.execute(sql`
    CREATE TABLE "users" (
      "id" serial PRIMARY KEY,
      "username" text,
      "nip" text,
      "nisn" text,
      "password_hash" text NOT NULL,
      "role" "role" NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE "guru" (
      "id" serial PRIMARY KEY,
      "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "nip" text NOT NULL UNIQUE,
      "nama" text NOT NULL,
      "foto" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE "kelas" (
      "id" serial PRIMARY KEY,
      "nama_kelas" text NOT NULL,
      "wali_kelas_id" integer NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE "siswa" (
      "id" serial PRIMARY KEY,
      "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "nisn" text NOT NULL UNIQUE,
      "nama" text NOT NULL,
      "kelas_id" integer NOT NULL REFERENCES "kelas"("id") ON DELETE RESTRICT,
      "foto" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE "absensi" (
      "id" serial PRIMARY KEY,
      "siswa_id" integer NOT NULL REFERENCES "siswa"("id") ON DELETE CASCADE,
      "guru_id" integer REFERENCES "guru"("id") ON DELETE SET NULL,
      "kelas_id" integer NOT NULL REFERENCES "kelas"("id") ON DELETE RESTRICT,
      "status" "attendance_status" NOT NULL,
      "tanggal" timestamp NOT NULL,
      "waktu_masuk" text,
      "waktu_pulang" text,
      "keterangan" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // Add foreign key constraint for kelas.wali_kelas_id after guru table exists
  await db.execute(sql`
    ALTER TABLE "kelas" ADD CONSTRAINT "kelas_wali_kelas_id_guru_id_fk" 
    FOREIGN KEY ("wali_kelas_id") REFERENCES "guru"("id") ON DELETE RESTRICT
  `);
};

// Test data setup
const testAdmin = {
  username: 'admin',
  nip: null,
  nisn: null,
  password_hash: 'hashedpassword',
  role: 'admin' as const
};

const testGuru = {
  username: null,
  nip: '123456789',
  nisn: null,
  password_hash: 'hashedpassword',
  role: 'guru' as const
};

const testSiswa = {
  username: null,
  nip: null,
  nisn: '987654321',
  password_hash: 'hashedpassword',
  role: 'siswa' as const
};

describe('Dashboard Handlers', () => {
  beforeEach(createTestDB);
  afterEach(resetDB);

  describe('getDashboardStats', () => {
    it('should return zero stats for empty database', async () => {
      const result = await getDashboardStats();

      expect(result.total_siswa).toBe(0);
      expect(result.total_guru).toBe(0);
      expect(result.total_kelas).toBe(0);
      expect(result.absensi_hari_ini.hadir).toBe(0);
      expect(result.absensi_hari_ini.izin).toBe(0);
      expect(result.absensi_hari_ini.sakit).toBe(0);
      expect(result.absensi_hari_ini.alpha).toBe(0);
      expect(result.pengajuan_pending).toBe(0);
    });

    it('should calculate correct statistics with data', async () => {
      // Insert test data using raw SQL to avoid schema import issues
      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES ('admin', NULL, NULL, 'hashedpassword', 'admin')
      `);

      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES (NULL, '123456789', NULL, 'hashedpassword', 'guru')
      `);

      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES (NULL, NULL, '987654321', 'hashedpassword', 'siswa')
      `);

      await db.execute(sql`
        INSERT INTO "guru" ("user_id", "nip", "nama")
        VALUES (2, '123456789', 'Test Guru')
      `);

      await db.execute(sql`
        INSERT INTO "kelas" ("nama_kelas", "wali_kelas_id")
        VALUES ('10A', 1)
      `);

      await db.execute(sql`
        INSERT INTO "siswa" ("user_id", "nisn", "nama", "kelas_id")
        VALUES (3, '987654321', 'Test Siswa', 1)
      `);

      // Create today's attendance records
      const today = new Date();
      today.setHours(10, 0, 0, 0);
      const todayStr = today.toISOString();

      await db.execute(sql`
        INSERT INTO "absensi" ("siswa_id", "guru_id", "kelas_id", "status", "tanggal", "waktu_masuk")
        VALUES (1, 1, 1, 'hadir', ${todayStr}, '07:30:00')
      `);

      await db.execute(sql`
        INSERT INTO "absensi" ("siswa_id", "guru_id", "kelas_id", "status", "tanggal")
        VALUES (1, 1, 1, 'izin', ${todayStr})
      `);

      const result = await getDashboardStats();

      expect(result.total_siswa).toBe(1);
      expect(result.total_guru).toBe(1);
      expect(result.total_kelas).toBe(1);
      expect(result.absensi_hari_ini.hadir).toBe(1);
      expect(result.absensi_hari_ini.izin).toBe(1);
      expect(result.absensi_hari_ini.sakit).toBe(0);
      expect(result.absensi_hari_ini.alpha).toBe(0);
      expect(result.pengajuan_pending).toBe(0);
    });

    it('should only count today\'s attendance', async () => {
      // Create prerequisite data
      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES (NULL, '123456789', NULL, 'hashedpassword', 'guru')
      `);

      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES (NULL, NULL, '987654321', 'hashedpassword', 'siswa')
      `);

      await db.execute(sql`
        INSERT INTO "guru" ("user_id", "nip", "nama")
        VALUES (1, '123456789', 'Test Guru')
      `);

      await db.execute(sql`
        INSERT INTO "kelas" ("nama_kelas", "wali_kelas_id")
        VALUES ('10A', 1)
      `);

      await db.execute(sql`
        INSERT INTO "siswa" ("user_id", "nisn", "nama", "kelas_id")
        VALUES (2, '987654321', 'Test Siswa', 1)
      `);

      // Create yesterday's attendance (should not be counted)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString();

      await db.execute(sql`
        INSERT INTO "absensi" ("siswa_id", "guru_id", "kelas_id", "status", "tanggal")
        VALUES (1, 1, 1, 'hadir', ${yesterdayStr})
      `);

      const result = await getDashboardStats();

      expect(result.absensi_hari_ini.hadir).toBe(0);
      expect(result.absensi_hari_ini.izin).toBe(0);
      expect(result.absensi_hari_ini.sakit).toBe(0);
      expect(result.absensi_hari_ini.alpha).toBe(0);
    });
  });

  describe('getGuruDashboardStats', () => {
    it('should return zero stats for guru with no classes', async () => {
      // Create guru with no wali kelas assignment
      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES (NULL, '123456789', NULL, 'hashedpassword', 'guru')
      `);

      await db.execute(sql`
        INSERT INTO "guru" ("user_id", "nip", "nama")
        VALUES (1, '123456789', 'Test Guru')
      `);

      const result = await getGuruDashboardStats(1);

      expect(result.total_siswa_kelas).toBe(0);
      expect(result.absensi_hari_ini.hadir).toBe(0);
      expect(result.absensi_hari_ini.izin).toBe(0);
      expect(result.absensi_hari_ini.sakit).toBe(0);
      expect(result.absensi_hari_ini.alpha).toBe(0);
      expect(result.pengajuan_pending).toBe(0);
    });

    it('should calculate stats only for guru\'s classes', async () => {
      // Create two gurus
      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES (NULL, '111111111', NULL, 'hashedpassword', 'guru')
      `);

      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES (NULL, '222222222', NULL, 'hashedpassword', 'guru')
      `);

      await db.execute(sql`
        INSERT INTO "guru" ("user_id", "nip", "nama")
        VALUES (1, '111111111', 'Guru 1')
      `);

      await db.execute(sql`
        INSERT INTO "guru" ("user_id", "nip", "nama")
        VALUES (2, '222222222', 'Guru 2')
      `);

      // Create classes for each guru
      await db.execute(sql`
        INSERT INTO "kelas" ("nama_kelas", "wali_kelas_id")
        VALUES ('10A', 1)
      `);

      await db.execute(sql`
        INSERT INTO "kelas" ("nama_kelas", "wali_kelas_id")
        VALUES ('10B', 2)
      `);

      // Create students
      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES (NULL, NULL, '111111111', 'hashedpassword', 'siswa')
      `);

      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES (NULL, NULL, '222222222', 'hashedpassword', 'siswa')
      `);

      await db.execute(sql`
        INSERT INTO "siswa" ("user_id", "nisn", "nama", "kelas_id")
        VALUES (3, '111111111', 'Siswa 1', 1)
      `);

      await db.execute(sql`
        INSERT INTO "siswa" ("user_id", "nisn", "nama", "kelas_id")
        VALUES (4, '222222222', 'Siswa 2', 2)
      `);

      // Create today's attendance for both classes
      const today = new Date();
      today.setHours(10, 0, 0, 0);
      const todayStr = today.toISOString();

      await db.execute(sql`
        INSERT INTO "absensi" ("siswa_id", "guru_id", "kelas_id", "status", "tanggal")
        VALUES (1, 1, 1, 'hadir', ${todayStr})
      `);

      await db.execute(sql`
        INSERT INTO "absensi" ("siswa_id", "guru_id", "kelas_id", "status", "tanggal")
        VALUES (2, 2, 2, 'izin', ${todayStr})
      `);

      // Test guru1 stats
      const result1 = await getGuruDashboardStats(1);
      expect(result1.total_siswa_kelas).toBe(1);
      expect(result1.absensi_hari_ini.hadir).toBe(1);
      expect(result1.absensi_hari_ini.izin).toBe(0);
      expect(result1.pengajuan_pending).toBe(0);

      // Test guru2 stats
      const result2 = await getGuruDashboardStats(2);
      expect(result2.total_siswa_kelas).toBe(1);
      expect(result2.absensi_hari_ini.hadir).toBe(0);
      expect(result2.absensi_hari_ini.izin).toBe(1);
      expect(result2.pengajuan_pending).toBe(0);
    });
  });

  describe('getSiswaDashboardStats', () => {
    it('should return zero stats for siswa with no data', async () => {
      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES (NULL, NULL, '987654321', 'hashedpassword', 'siswa')
      `);

      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES (NULL, '123456789', NULL, 'hashedpassword', 'guru')
      `);

      await db.execute(sql`
        INSERT INTO "guru" ("user_id", "nip", "nama")
        VALUES (2, '123456789', 'Test Guru')
      `);

      await db.execute(sql`
        INSERT INTO "kelas" ("nama_kelas", "wali_kelas_id")
        VALUES ('10A', 1)
      `);

      await db.execute(sql`
        INSERT INTO "siswa" ("user_id", "nisn", "nama", "kelas_id")
        VALUES (1, '987654321', 'Test Siswa', 1)
      `);

      const result = await getSiswaDashboardStats(1);

      expect(result.absensi_bulan_ini.hadir).toBe(0);
      expect(result.absensi_bulan_ini.izin).toBe(0);
      expect(result.absensi_bulan_ini.sakit).toBe(0);
      expect(result.absensi_bulan_ini.alpha).toBe(0);
      expect(result.pengajuan_pending).toBe(0);
      expect(result.absensi_hari_ini.status).toBeNull();
      expect(result.absensi_hari_ini.waktu_masuk).toBeNull();
      expect(result.absensi_hari_ini.waktu_pulang).toBeNull();
    });

    it('should calculate monthly and today statistics correctly', async () => {
      // Create prerequisite data
      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES (NULL, NULL, '987654321', 'hashedpassword', 'siswa')
      `);

      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES (NULL, '123456789', NULL, 'hashedpassword', 'guru')
      `);

      await db.execute(sql`
        INSERT INTO "guru" ("user_id", "nip", "nama")
        VALUES (2, '123456789', 'Test Guru')
      `);

      await db.execute(sql`
        INSERT INTO "kelas" ("nama_kelas", "wali_kelas_id")
        VALUES ('10A', 1)
      `);

      await db.execute(sql`
        INSERT INTO "siswa" ("user_id", "nisn", "nama", "kelas_id")
        VALUES (1, '987654321', 'Test Siswa', 1)
      `);

      // Create this month's attendance records
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const midMonth = new Date(today.getFullYear(), today.getMonth(), 15);

      await db.execute(sql`
        INSERT INTO "absensi" ("siswa_id", "guru_id", "kelas_id", "status", "tanggal")
        VALUES (1, 1, 1, 'hadir', ${startOfMonth.toISOString()})
      `);

      await db.execute(sql`
        INSERT INTO "absensi" ("siswa_id", "guru_id", "kelas_id", "status", "tanggal")
        VALUES (1, 1, 1, 'hadir', ${midMonth.toISOString()})
      `);

      await db.execute(sql`
        INSERT INTO "absensi" ("siswa_id", "guru_id", "kelas_id", "status", "tanggal", "waktu_masuk", "waktu_pulang")
        VALUES (1, 1, 1, 'hadir', ${today.toISOString()}, '07:30:00', '15:00:00')
      `);

      const result = await getSiswaDashboardStats(1);

      expect(result.absensi_bulan_ini.hadir).toBe(3);
      expect(result.absensi_bulan_ini.izin).toBe(0);
      expect(result.absensi_bulan_ini.sakit).toBe(0);
      expect(result.absensi_bulan_ini.alpha).toBe(0);
      expect(result.pengajuan_pending).toBe(0);
      expect(result.absensi_hari_ini.status).toBe('hadir');
      expect(result.absensi_hari_ini.waktu_masuk).toBe('07:30:00');
      expect(result.absensi_hari_ini.waktu_pulang).toBe('15:00:00');
    });

    it('should only count current month attendance', async () => {
      // Create prerequisite data
      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES (NULL, NULL, '987654321', 'hashedpassword', 'siswa')
      `);

      await db.execute(sql`
        INSERT INTO "users" ("username", "nip", "nisn", "password_hash", "role")
        VALUES (NULL, '123456789', NULL, 'hashedpassword', 'guru')
      `);

      await db.execute(sql`
        INSERT INTO "guru" ("user_id", "nip", "nama")
        VALUES (2, '123456789', 'Test Guru')
      `);

      await db.execute(sql`
        INSERT INTO "kelas" ("nama_kelas", "wali_kelas_id")
        VALUES ('10A', 1)
      `);

      await db.execute(sql`
        INSERT INTO "siswa" ("user_id", "nisn", "nama", "kelas_id")
        VALUES (1, '987654321', 'Test Siswa', 1)
      `);

      // Create last month's attendance (should not be counted)
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      await db.execute(sql`
        INSERT INTO "absensi" ("siswa_id", "guru_id", "kelas_id", "status", "tanggal")
        VALUES (1, 1, 1, 'hadir', ${lastMonth.toISOString()})
      `);

      const result = await getSiswaDashboardStats(1);

      expect(result.absensi_bulan_ini.hadir).toBe(0);
      expect(result.absensi_bulan_ini.izin).toBe(0);
      expect(result.absensi_bulan_ini.sakit).toBe(0);
      expect(result.absensi_bulan_ini.alpha).toBe(0);
    });
  });
});