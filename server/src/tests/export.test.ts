import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB } from '../helpers';
import { db } from '../db';
import { usersTable, siswaTable, guruTable, kelasTable, absensiTable } from '../db/schema';
import { type GetAbsensiHistoryInput } from '../schema';
import { exportAbsensiToPDF, exportAbsensiToExcel, generateRekapAbsensi } from '../handlers/export';
import { sql } from 'drizzle-orm';

// Custom createDB that only creates tables needed for export tests
const createExportTestDB = async () => {
  // Create the tables manually without the problematic pengajuanIzinTable
  await db.execute(sql`
    CREATE TYPE role AS ENUM ('admin', 'guru', 'siswa');
    CREATE TYPE attendance_status AS ENUM ('hadir', 'izin', 'sakit', 'alpha');
    CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
    
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      username TEXT,
      nip TEXT,
      nisn TEXT,
      password_hash TEXT NOT NULL,
      role role NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    
    CREATE TABLE kelas (
      id SERIAL PRIMARY KEY,
      nama_kelas TEXT NOT NULL,
      wali_kelas_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    
    CREATE TABLE siswa (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nisn TEXT NOT NULL UNIQUE,
      nama TEXT NOT NULL,
      kelas_id INTEGER NOT NULL REFERENCES kelas(id) ON DELETE RESTRICT,
      foto TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    
    CREATE TABLE guru (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nip TEXT NOT NULL UNIQUE,
      nama TEXT NOT NULL,
      foto TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    
    CREATE TABLE absensi (
      id SERIAL PRIMARY KEY,
      siswa_id INTEGER NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
      guru_id INTEGER REFERENCES guru(id) ON DELETE SET NULL,
      kelas_id INTEGER NOT NULL REFERENCES kelas(id) ON DELETE RESTRICT,
      status attendance_status NOT NULL,
      tanggal TIMESTAMP NOT NULL,
      waktu_masuk TEXT,
      waktu_pulang TEXT,
      keterangan TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    
    -- Add foreign key constraint after guru table is created
    ALTER TABLE kelas ADD CONSTRAINT kelas_wali_kelas_id_fkey 
    FOREIGN KEY (wali_kelas_id) REFERENCES guru(id) ON DELETE RESTRICT;
  `);
};

describe('Export Handlers', () => {
  beforeEach(createExportTestDB);
  afterEach(resetDB);

  // Helper function to create test data
  async function createTestData() {
    // Create test users
    const [adminUser] = await db.insert(usersTable)
      .values({
        username: 'admin',
        nip: null,
        nisn: null,
        password_hash: 'hashed_password',
        role: 'admin'
      })
      .returning()
      .execute();

    const [guruUser] = await db.insert(usersTable)
      .values({
        username: null,
        nip: '123456789',
        nisn: null,
        password_hash: 'hashed_password',
        role: 'guru'
      })
      .returning()
      .execute();

    const [siswaUser1] = await db.insert(usersTable)
      .values({
        username: null,
        nip: null,
        nisn: '1234567890',
        password_hash: 'hashed_password',
        role: 'siswa'
      })
      .returning()
      .execute();

    const [siswaUser2] = await db.insert(usersTable)
      .values({
        username: null,
        nip: null,
        nisn: '1234567891',
        password_hash: 'hashed_password',
        role: 'siswa'
      })
      .returning()
      .execute();

    // Create guru first (needed for kelas foreign key)
    const [guru] = await db.insert(guruTable)
      .values({
        user_id: guruUser.id,
        nip: '123456789',
        nama: 'Pak Budi',
        foto: null
      })
      .returning()
      .execute();

    // Create kelas
    const [kelas] = await db.insert(kelasTable)
      .values({
        nama_kelas: 'XII IPA 1',
        wali_kelas_id: guru.id
      })
      .returning()
      .execute();

    // Create siswa
    const [siswa1] = await db.insert(siswaTable)
      .values({
        user_id: siswaUser1.id,
        nisn: '1234567890',
        nama: 'Ahmad Fadli',
        kelas_id: kelas.id,
        foto: null
      })
      .returning()
      .execute();

    const [siswa2] = await db.insert(siswaTable)
      .values({
        user_id: siswaUser2.id,
        nisn: '1234567891',
        nama: 'Siti Nurhaliza',
        kelas_id: kelas.id,
        foto: null
      })
      .returning()
      .execute();

    // Create absensi records with specific timestamps
    const today = new Date();
    today.setHours(8, 0, 0, 0); // 8 AM today
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(8, 0, 0, 0); // 8 AM yesterday

    await db.insert(absensiTable)
      .values([
        {
          siswa_id: siswa1.id,
          guru_id: guru.id,
          kelas_id: kelas.id,
          status: 'hadir',
          tanggal: today,
          waktu_masuk: '07:30:00',
          waktu_pulang: '15:00:00',
          keterangan: null
        },
        {
          siswa_id: siswa2.id,
          guru_id: guru.id,
          kelas_id: kelas.id,
          status: 'izin',
          tanggal: today,
          waktu_masuk: null,
          waktu_pulang: null,
          keterangan: 'Izin sakit'
        },
        {
          siswa_id: siswa1.id,
          guru_id: guru.id,
          kelas_id: kelas.id,
          status: 'alpha',
          tanggal: yesterday,
          waktu_masuk: null,
          waktu_pulang: null,
          keterangan: 'Tidak hadir tanpa keterangan'
        },
        {
          siswa_id: siswa2.id,
          guru_id: null,
          kelas_id: kelas.id,
          status: 'sakit',
          tanggal: yesterday,
          waktu_masuk: null,
          waktu_pulang: null,
          keterangan: 'Sakit demam'
        }
      ])
      .execute();

    return {
      adminUser,
      guruUser,
      siswaUser1,
      siswaUser2,
      guru,
      kelas,
      siswa1,
      siswa2
    };
  }

  describe('exportAbsensiToPDF', () => {
    it('should export absensi to PDF successfully', async () => {
      await createTestData();

      const input: GetAbsensiHistoryInput = {
        limit: 50,
        offset: 0
      };

      const result = await exportAbsensiToPDF(input);

      expect(result.success).toBe(true);
      expect(result.downloadUrl).toBeDefined();
      expect(result.downloadUrl).toMatch(/\/exports\/pdf\/absensi_report_\d{8}_\d{6}\.pdf/);
      expect(result.message).toContain('PDF berhasil dibuat dengan');
      expect(result.message).toContain('record absensi');
    });

    it('should handle filtered PDF export', async () => {
      const testData = await createTestData();

      const input: GetAbsensiHistoryInput = {
        siswa_id: testData.siswa1.id,
        limit: 50,
        offset: 0
      };

      const result = await exportAbsensiToPDF(input);

      expect(result.success).toBe(true);
      expect(result.downloadUrl).toBeDefined();
      expect(result.message).toContain('2 record absensi'); // siswa1 has 2 records
    });

    it('should handle no data found for PDF export', async () => {
      const input: GetAbsensiHistoryInput = {
        siswa_id: 99999, // Non-existent siswa
        limit: 50,
        offset: 0
      };

      const result = await exportAbsensiToPDF(input);

      expect(result.success).toBe(false);
      expect(result.downloadUrl).toBeUndefined();
      expect(result.message).toBe('Tidak ada data absensi yang ditemukan untuk kriteria yang diberikan');
    });

    it('should handle date range filtering for PDF', async () => {
      await createTestData();

      // Use start of day for proper date comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const input: GetAbsensiHistoryInput = {
        start_date: today,
        end_date: endOfDay,
        limit: 50,
        offset: 0
      };

      const result = await exportAbsensiToPDF(input);

      expect(result.success).toBe(true);
      expect(result.message).toContain('2 record absensi'); // Only today's records
    });
  });

  describe('exportAbsensiToExcel', () => {
    it('should export absensi to Excel successfully', async () => {
      await createTestData();

      const input: GetAbsensiHistoryInput = {
        limit: 50,
        offset: 0
      };

      const result = await exportAbsensiToExcel(input);

      expect(result.success).toBe(true);
      expect(result.downloadUrl).toBeDefined();
      expect(result.downloadUrl).toMatch(/\/exports\/excel\/absensi_export_\d{8}_\d{6}\.xlsx/);
      expect(result.message).toContain('Excel berhasil dibuat dengan');
      expect(result.message).toContain('dalam 2 sheet');
    });

    it('should handle filtered Excel export by kelas', async () => {
      const testData = await createTestData();

      const input: GetAbsensiHistoryInput = {
        kelas_id: testData.kelas.id,
        limit: 50,
        offset: 0
      };

      const result = await exportAbsensiToExcel(input);

      expect(result.success).toBe(true);
      expect(result.downloadUrl).toBeDefined();
      expect(result.message).toContain('4 record absensi'); // All 4 records from the class
    });

    it('should handle no data found for Excel export', async () => {
      const input: GetAbsensiHistoryInput = {
        kelas_id: 99999, // Non-existent kelas
        limit: 50,
        offset: 0
      };

      const result = await exportAbsensiToExcel(input);

      expect(result.success).toBe(false);
      expect(result.downloadUrl).toBeUndefined();
      expect(result.message).toBe('Tidak ada data absensi yang ditemukan untuk kriteria yang diberikan');
    });

    it('should handle pagination parameters', async () => {
      await createTestData();

      const input: GetAbsensiHistoryInput = {
        limit: 2,
        offset: 1
      };

      const result = await exportAbsensiToExcel(input);

      expect(result.success).toBe(true);
      expect(result.message).toContain('2 record absensi'); // Limited to 2 records
    });
  });

  describe('generateRekapAbsensi', () => {
    it('should generate PDF recap successfully', async () => {
      await createTestData();

      // Use a wider date range to ensure we capture all test data
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      const input = {
        startDate,
        endDate,
        format: 'pdf' as const
      };

      const result = await generateRekapAbsensi(input);

      expect(result.success).toBe(true);
      expect(result.downloadUrl).toBeDefined();
      expect(result.downloadUrl).toMatch(/\/exports\/pdf\/rekap_absensi_\d{8}_\d{8}\.pdf/);
      expect(result.message).toContain('Rekap absensi berhasil dibuat dalam format PDF');
      expect(result.message).toContain('4 record dari 2 siswa'); // Should contain all 4 records
    });

    it('should generate Excel recap successfully', async () => {
      await createTestData();

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5);
      const endDate = new Date();

      const input = {
        startDate,
        endDate,
        format: 'excel' as const
      };

      const result = await generateRekapAbsensi(input);

      expect(result.success).toBe(true);
      expect(result.downloadUrl).toBeDefined();
      expect(result.downloadUrl).toMatch(/\/exports\/excel\/rekap_absensi_\d{8}_\d{8}\.xlsx/);
      expect(result.message).toContain('Rekap absensi berhasil dibuat dalam format EXCEL');
    });

    it('should generate recap filtered by kelas', async () => {
      const testData = await createTestData();

      // Use a wider date range to ensure we capture all test data
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      const input = {
        kelasId: testData.kelas.id,
        startDate,
        endDate,
        format: 'pdf' as const
      };

      const result = await generateRekapAbsensi(input);

      expect(result.success).toBe(true);
      expect(result.downloadUrl).toBeDefined();
      expect(result.message).toContain('4 record dari 2 siswa'); // Should contain all 4 records from the class
    });

    it('should handle no data found for recap', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const endFutureDate = new Date(futureDate);
      endFutureDate.setDate(endFutureDate.getDate() + 1);

      const input = {
        startDate: futureDate,
        endDate: endFutureDate,
        format: 'pdf' as const
      };

      const result = await generateRekapAbsensi(input);

      expect(result.success).toBe(false);
      expect(result.downloadUrl).toBeUndefined();
      expect(result.message).toBe('Tidak ada data absensi yang ditemukan untuk periode yang dipilih');
    });

    it('should handle date range properly in recap', async () => {
      await createTestData();

      // Use proper date boundaries
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      const input = {
        startDate: yesterday,
        endDate: endOfYesterday,
        format: 'excel' as const
      };

      const result = await generateRekapAbsensi(input);

      expect(result.success).toBe(true);
      expect(result.message).toContain('2 record'); // Only yesterday's records
    });
  });

  describe('Error handling', () => {
    it('should handle database errors in PDF export', async () => {
      // Create invalid input that would cause database errors
      const input: GetAbsensiHistoryInput = {
        siswa_id: -1, // Invalid ID
        limit: 50,
        offset: 0
      };

      const result = await exportAbsensiToPDF(input);

      // Should handle gracefully - no matching records
      expect(result.success).toBe(false);
      expect(result.message).toBe('Tidak ada data absensi yang ditemukan untuk kriteria yang diberikan');
    });

    it('should handle database errors in Excel export', async () => {
      const input: GetAbsensiHistoryInput = {
        kelas_id: -1, // Invalid ID
        limit: 50,
        offset: 0
      };

      const result = await exportAbsensiToExcel(input);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Tidak ada data absensi yang ditemukan untuk kriteria yang diberikan');
    });

    it('should handle database errors in recap generation', async () => {
      const startDate = new Date();
      const endDate = new Date();

      const input = {
        kelasId: -1, // Invalid kelas ID
        startDate,
        endDate,
        format: 'pdf' as const
      };

      const result = await generateRekapAbsensi(input);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Tidak ada data absensi yang ditemukan untuk periode yang dipilih');
    });
  });
});