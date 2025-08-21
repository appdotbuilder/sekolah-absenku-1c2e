import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, kelasTable, guruTable, siswaTable } from '../db/schema';
import { type CreateSiswaInput, type UpdateSiswaInput } from '../schema';
import { 
  createSiswa, 
  updateSiswa, 
  deleteSiswa, 
  getAllSiswa, 
  getSiswaByKelas, 
  getSiswaById 
} from '../handlers/siswa';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

describe('siswa handlers', () => {
  beforeEach(async () => {
    await resetDB();
    
    // Create schema manually without the problematic pengajuanIzinTable
    await db.execute(sql`
      CREATE TYPE "role" AS ENUM('admin', 'guru', 'siswa');
      CREATE TYPE "attendance_status" AS ENUM('hadir', 'izin', 'sakit', 'alpha');
      CREATE TYPE "request_status" AS ENUM('pending', 'approved', 'rejected');

      CREATE TABLE "users" (
        "id" serial PRIMARY KEY NOT NULL,
        "username" text,
        "nip" text,
        "nisn" text,
        "password_hash" text NOT NULL,
        "role" "role" NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE "kelas" (
        "id" serial PRIMARY KEY NOT NULL,
        "nama_kelas" text NOT NULL,
        "wali_kelas_id" integer NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE "guru" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "nip" text NOT NULL UNIQUE,
        "nama" text NOT NULL,
        "foto" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE "siswa" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "nisn" text NOT NULL UNIQUE,
        "nama" text NOT NULL,
        "kelas_id" integer NOT NULL,
        "foto" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      ALTER TABLE "guru" ADD CONSTRAINT "guru_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
      ALTER TABLE "siswa" ADD CONSTRAINT "siswa_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
      ALTER TABLE "siswa" ADD CONSTRAINT "siswa_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "kelas"("id") ON DELETE restrict ON UPDATE no action;
      ALTER TABLE "kelas" ADD CONSTRAINT "kelas_wali_kelas_id_guru_id_fk" FOREIGN KEY ("wali_kelas_id") REFERENCES "guru"("id") ON DELETE restrict ON UPDATE no action;
    `);
  });

  afterEach(resetDB);

  let testUserId: number;
  let testKelasId: number;
  let testGuruId: number;

  // Helper to create prerequisite data
  const createPrerequisites = async () => {
    // Create test user for siswa
    const siswaUser = await db.insert(usersTable)
      .values({
        nisn: '1234567890',
        password_hash: 'hashed_password',
        role: 'siswa'
      })
      .returning()
      .execute();
    testUserId = siswaUser[0].id;

    // Create test guru user first
    const guruUser = await db.insert(usersTable)
      .values({
        nip: '98765432',
        password_hash: 'hashed_password',
        role: 'guru'
      })
      .returning()
      .execute();

    // Create test guru profile
    const guru = await db.insert(guruTable)
      .values({
        user_id: guruUser[0].id,
        nip: '98765432',
        nama: 'Test Guru'
      })
      .returning()
      .execute();
    testGuruId = guru[0].id;

    // Create test kelas
    const kelas = await db.insert(kelasTable)
      .values({
        nama_kelas: 'XII IPA 1',
        wali_kelas_id: testGuruId
      })
      .returning()
      .execute();
    testKelasId = kelas[0].id;
  };

  describe('createSiswa', () => {
    it('should create a siswa successfully', async () => {
      await createPrerequisites();

      const input: CreateSiswaInput = {
        user_id: testUserId,
        nisn: '1234567890',
        nama: 'Test Siswa',
        kelas_id: testKelasId,
        foto: 'photo.jpg'
      };

      const result = await createSiswa(input);

      expect(result.user_id).toEqual(testUserId);
      expect(result.nisn).toEqual('1234567890');
      expect(result.nama).toEqual('Test Siswa');
      expect(result.kelas_id).toEqual(testKelasId);
      expect(result.foto).toEqual('photo.jpg');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save siswa to database', async () => {
      await createPrerequisites();

      const input: CreateSiswaInput = {
        user_id: testUserId,
        nisn: '1234567890',
        nama: 'Test Siswa',
        kelas_id: testKelasId,
        foto: null
      };

      const result = await createSiswa(input);

      const savedSiswa = await db.select()
        .from(siswaTable)
        .where(eq(siswaTable.id, result.id))
        .execute();

      expect(savedSiswa).toHaveLength(1);
      expect(savedSiswa[0].nama).toEqual('Test Siswa');
      expect(savedSiswa[0].nisn).toEqual('1234567890');
      expect(savedSiswa[0].user_id).toEqual(testUserId);
      expect(savedSiswa[0].kelas_id).toEqual(testKelasId);
      expect(savedSiswa[0].foto).toBeNull();
    });

    it('should throw error for invalid user_id', async () => {
      await createPrerequisites();

      const input: CreateSiswaInput = {
        user_id: 99999,
        nisn: '1234567890',
        nama: 'Test Siswa',
        kelas_id: testKelasId,
        foto: null
      };

      await expect(createSiswa(input)).rejects.toThrow(/invalid user_id/i);
    });

    it('should throw error for non-siswa user', async () => {
      await createPrerequisites();

      // Create admin user
      const adminUser = await db.insert(usersTable)
        .values({
          username: 'admin',
          password_hash: 'hashed_password',
          role: 'admin'
        })
        .returning()
        .execute();

      const input: CreateSiswaInput = {
        user_id: adminUser[0].id,
        nisn: '1234567890',
        nama: 'Test Siswa',
        kelas_id: testKelasId,
        foto: null
      };

      await expect(createSiswa(input)).rejects.toThrow(/not a siswa/i);
    });

    it('should throw error for invalid kelas_id', async () => {
      await createPrerequisites();

      const input: CreateSiswaInput = {
        user_id: testUserId,
        nisn: '1234567890',
        nama: 'Test Siswa',
        kelas_id: 99999,
        foto: null
      };

      await expect(createSiswa(input)).rejects.toThrow(/kelas not found/i);
    });

    it('should throw error for duplicate NISN', async () => {
      await createPrerequisites();

      // Create first siswa
      const input1: CreateSiswaInput = {
        user_id: testUserId,
        nisn: '1234567890',
        nama: 'First Siswa',
        kelas_id: testKelasId,
        foto: null
      };
      await createSiswa(input1);

      // Create another user
      const user2 = await db.insert(usersTable)
        .values({
          nisn: '0987654321',
          password_hash: 'hashed_password',
          role: 'siswa'
        })
        .returning()
        .execute();

      // Try to create second siswa with same NISN
      const input2: CreateSiswaInput = {
        user_id: user2[0].id,
        nisn: '1234567890', // Same NISN
        nama: 'Second Siswa',
        kelas_id: testKelasId,
        foto: null
      };

      await expect(createSiswa(input2)).rejects.toThrow(/nisn already exists/i);
    });
  });

  describe('updateSiswa', () => {
    let testSiswaId: number;

    beforeEach(async () => {
      await createPrerequisites();

      const siswa = await createSiswa({
        user_id: testUserId,
        nisn: '1234567890',
        nama: 'Original Name',
        kelas_id: testKelasId,
        foto: 'original.jpg'
      });
      testSiswaId = siswa.id;
    });

    it('should update siswa name', async () => {
      const input: UpdateSiswaInput = {
        id: testSiswaId,
        nama: 'Updated Name'
      };

      const result = await updateSiswa(input);

      expect(result.nama).toEqual('Updated Name');
      expect(result.id).toEqual(testSiswaId);
    });

    it('should update siswa kelas', async () => {
      // Create another kelas
      const kelas2 = await db.insert(kelasTable)
        .values({
          nama_kelas: 'XI IPA 2',
          wali_kelas_id: testGuruId
        })
        .returning()
        .execute();

      const input: UpdateSiswaInput = {
        id: testSiswaId,
        kelas_id: kelas2[0].id
      };

      const result = await updateSiswa(input);

      expect(result.kelas_id).toEqual(kelas2[0].id);
    });

    it('should update siswa foto to null', async () => {
      const input: UpdateSiswaInput = {
        id: testSiswaId,
        foto: null
      };

      const result = await updateSiswa(input);

      expect(result.foto).toBeNull();
    });

    it('should update multiple fields', async () => {
      const input: UpdateSiswaInput = {
        id: testSiswaId,
        nama: 'New Name',
        foto: 'new_photo.jpg'
      };

      const result = await updateSiswa(input);

      expect(result.nama).toEqual('New Name');
      expect(result.foto).toEqual('new_photo.jpg');
    });

    it('should throw error for non-existent siswa', async () => {
      const input: UpdateSiswaInput = {
        id: 99999,
        nama: 'Updated Name'
      };

      await expect(updateSiswa(input)).rejects.toThrow(/siswa not found/i);
    });

    it('should throw error for invalid kelas_id', async () => {
      const input: UpdateSiswaInput = {
        id: testSiswaId,
        kelas_id: 99999
      };

      await expect(updateSiswa(input)).rejects.toThrow(/kelas not found/i);
    });
  });

  describe('deleteSiswa', () => {
    let testSiswaId: number;

    beforeEach(async () => {
      await createPrerequisites();

      const siswa = await createSiswa({
        user_id: testUserId,
        nisn: '1234567890',
        nama: 'Test Siswa',
        kelas_id: testKelasId,
        foto: null
      });
      testSiswaId = siswa.id;
    });

    it('should delete siswa successfully', async () => {
      const result = await deleteSiswa(testSiswaId);

      expect(result.success).toBe(true);
      expect(result.message).toEqual('Siswa deleted successfully');
    });

    it('should remove siswa from database', async () => {
      await deleteSiswa(testSiswaId);

      const siswa = await db.select()
        .from(siswaTable)
        .where(eq(siswaTable.id, testSiswaId))
        .execute();

      expect(siswa).toHaveLength(0);
    });

    it('should throw error for non-existent siswa', async () => {
      await expect(deleteSiswa(99999)).rejects.toThrow(/siswa not found/i);
    });
  });

  describe('getAllSiswa', () => {
    it('should return empty array when no siswa exist', async () => {
      const result = await getAllSiswa();
      expect(result).toEqual([]);
    });

    it('should return all siswa', async () => {
      await createPrerequisites();

      // Create multiple siswa
      const siswa1 = await createSiswa({
        user_id: testUserId,
        nisn: '1234567890',
        nama: 'Siswa 1',
        kelas_id: testKelasId,
        foto: null
      });

      // Create another user and siswa
      const user2 = await db.insert(usersTable)
        .values({
          nisn: '0987654321',
          password_hash: 'hashed_password',
          role: 'siswa'
        })
        .returning()
        .execute();

      const siswa2 = await createSiswa({
        user_id: user2[0].id,
        nisn: '0987654321',
        nama: 'Siswa 2',
        kelas_id: testKelasId,
        foto: null
      });

      const result = await getAllSiswa();

      expect(result).toHaveLength(2);
      expect(result.find(s => s.id === siswa1.id)).toBeDefined();
      expect(result.find(s => s.id === siswa2.id)).toBeDefined();
    });
  });

  describe('getSiswaByKelas', () => {
    it('should throw error for non-existent kelas', async () => {
      await expect(getSiswaByKelas(99999)).rejects.toThrow(/kelas not found/i);
    });

    it('should return empty array for kelas with no siswa', async () => {
      await createPrerequisites();

      const result = await getSiswaByKelas(testKelasId);
      expect(result).toEqual([]);
    });

    it('should return siswa for specific kelas', async () => {
      await createPrerequisites();

      // Create siswa in test kelas
      const siswa1 = await createSiswa({
        user_id: testUserId,
        nisn: '1234567890',
        nama: 'Siswa 1',
        kelas_id: testKelasId,
        foto: null
      });

      // Create another kelas and siswa
      const kelas2 = await db.insert(kelasTable)
        .values({
          nama_kelas: 'XI IPA 2',
          wali_kelas_id: testGuruId
        })
        .returning()
        .execute();

      const user2 = await db.insert(usersTable)
        .values({
          nisn: '0987654321',
          password_hash: 'hashed_password',
          role: 'siswa'
        })
        .returning()
        .execute();

      await createSiswa({
        user_id: user2[0].id,
        nisn: '0987654321',
        nama: 'Siswa 2',
        kelas_id: kelas2[0].id,
        foto: null
      });

      const result = await getSiswaByKelas(testKelasId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(siswa1.id);
      expect(result[0].nama).toEqual('Siswa 1');
    });
  });

  describe('getSiswaById', () => {
    it('should return null for non-existent siswa', async () => {
      const result = await getSiswaById(99999);
      expect(result).toBeNull();
    });

    it('should return siswa by id', async () => {
      await createPrerequisites();

      const siswa = await createSiswa({
        user_id: testUserId,
        nisn: '1234567890',
        nama: 'Test Siswa',
        kelas_id: testKelasId,
        foto: 'photo.jpg'
      });

      const result = await getSiswaById(siswa.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(siswa.id);
      expect(result!.nama).toEqual('Test Siswa');
      expect(result!.nisn).toEqual('1234567890');
      expect(result!.foto).toEqual('photo.jpg');
    });
  });
});