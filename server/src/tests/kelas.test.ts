import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { db } from '../db';
import { 
  usersTable, 
  guruTable, 
  kelasTable, 
  siswaTable,
  roleEnum
} from '../db/schema';
import { sql } from 'drizzle-orm';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import { type CreateKelasInput, type UpdateKelasInput } from '../schema';
import {
  createKelas,
  updateKelas,
  deleteKelas,
  getAllKelas,
  getKelasByWaliKelas,
  getKelasById
} from '../handlers/kelas';
import { eq } from 'drizzle-orm';

// Custom DB helpers for this test file to avoid schema issues
const resetDB = async () => {
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`create schema public`);
  await db.execute(sql`drop schema if exists drizzle cascade`);
};

const createDB = async () => {
  // Create only the tables and enums we need for kelas testing
  const limitedSchema = {
    roleEnum,
    usersTable,
    guruTable,
    kelasTable,
    siswaTable
  };
  
  const migrationStatements = await generateMigration(
    generateDrizzleJson({}),
    generateDrizzleJson({ ...limitedSchema })
  );
  await db.execute(migrationStatements.join('\n'));
};

// Test data for creating prerequisite records
const testUser = {
  username: null,
  nip: 'NIP123456',
  nisn: null,
  password_hash: 'hashedpassword',
  role: 'guru' as const
};

const testGuru = {
  user_id: 0, // Will be set after user creation
  nip: 'NIP123456',
  nama: 'Test Guru',
  foto: null
};

const testKelasInput: CreateKelasInput = {
  nama_kelas: 'X-A',
  wali_kelas_id: 0 // Will be set after guru creation
};

describe('Kelas Handlers', () => {
  let testGuruId: number;
  let testUserId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test guru
    const guruResult = await db.insert(guruTable)
      .values({
        ...testGuru,
        user_id: testUserId
      })
      .returning()
      .execute();
    testGuruId = guruResult[0].id;
  });

  afterEach(resetDB);

  describe('createKelas', () => {
    it('should create a kelas with valid wali kelas', async () => {
      const input: CreateKelasInput = {
        ...testKelasInput,
        wali_kelas_id: testGuruId
      };

      const result = await createKelas(input);

      expect(result.nama_kelas).toEqual('X-A');
      expect(result.wali_kelas_id).toEqual(testGuruId);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save kelas to database', async () => {
      const input: CreateKelasInput = {
        ...testKelasInput,
        wali_kelas_id: testGuruId
      };

      const result = await createKelas(input);

      const kelasFromDb = await db.select()
        .from(kelasTable)
        .where(eq(kelasTable.id, result.id))
        .execute();

      expect(kelasFromDb).toHaveLength(1);
      expect(kelasFromDb[0].nama_kelas).toEqual('X-A');
      expect(kelasFromDb[0].wali_kelas_id).toEqual(testGuruId);
    });

    it('should throw error for non-existent wali kelas', async () => {
      const input: CreateKelasInput = {
        nama_kelas: 'X-B',
        wali_kelas_id: 999 // Non-existent guru ID
      };

      await expect(createKelas(input)).rejects.toThrow(/wali kelas.*not found/i);
    });
  });

  describe('updateKelas', () => {
    let kelasId: number;

    beforeEach(async () => {
      const input: CreateKelasInput = {
        ...testKelasInput,
        wali_kelas_id: testGuruId
      };
      const kelas = await createKelas(input);
      kelasId = kelas.id;
    });

    it('should update kelas nama', async () => {
      const updateInput: UpdateKelasInput = {
        id: kelasId,
        nama_kelas: 'X-B Updated'
      };

      const result = await updateKelas(updateInput);

      expect(result.nama_kelas).toEqual('X-B Updated');
      expect(result.wali_kelas_id).toEqual(testGuruId);
      expect(result.id).toEqual(kelasId);
    });

    it('should update wali kelas', async () => {
      // Create second guru
      const user2Result = await db.insert(usersTable)
        .values({
          ...testUser,
          nip: 'NIP789012'
        })
        .returning()
        .execute();

      const guru2Result = await db.insert(guruTable)
        .values({
          ...testGuru,
          user_id: user2Result[0].id,
          nip: 'NIP789012',
          nama: 'Second Guru'
        })
        .returning()
        .execute();

      const updateInput: UpdateKelasInput = {
        id: kelasId,
        wali_kelas_id: guru2Result[0].id
      };

      const result = await updateKelas(updateInput);

      expect(result.wali_kelas_id).toEqual(guru2Result[0].id);
      expect(result.nama_kelas).toEqual('X-A'); // Should remain unchanged
    });

    it('should throw error for non-existent kelas', async () => {
      const updateInput: UpdateKelasInput = {
        id: 999,
        nama_kelas: 'Non-existent'
      };

      await expect(updateKelas(updateInput)).rejects.toThrow(/kelas not found/i);
    });

    it('should throw error for non-existent wali kelas', async () => {
      const updateInput: UpdateKelasInput = {
        id: kelasId,
        wali_kelas_id: 999
      };

      await expect(updateKelas(updateInput)).rejects.toThrow(/wali kelas.*not found/i);
    });
  });

  describe('deleteKelas', () => {
    let kelasId: number;

    beforeEach(async () => {
      const input: CreateKelasInput = {
        ...testKelasInput,
        wali_kelas_id: testGuruId
      };
      const kelas = await createKelas(input);
      kelasId = kelas.id;
    });

    it('should delete kelas without students', async () => {
      const result = await deleteKelas(kelasId);

      expect(result.success).toBe(true);
      expect(result.message).toEqual('Kelas deleted successfully');

      // Verify deletion
      const kelasFromDb = await db.select()
        .from(kelasTable)
        .where(eq(kelasTable.id, kelasId))
        .execute();

      expect(kelasFromDb).toHaveLength(0);
    });

    it('should throw error when deleting kelas with assigned students', async () => {
      // Create a student user
      const studentUserResult = await db.insert(usersTable)
        .values({
          username: null,
          nip: null,
          nisn: '1234567890',
          password_hash: 'hashedpassword',
          role: 'siswa'
        })
        .returning()
        .execute();

      // Create a siswa assigned to the kelas
      await db.insert(siswaTable)
        .values({
          user_id: studentUserResult[0].id,
          nisn: '1234567890',
          nama: 'Test Siswa',
          kelas_id: kelasId,
          foto: null
        })
        .execute();

      await expect(deleteKelas(kelasId)).rejects.toThrow(/cannot delete kelas with assigned students/i);
    });

    it('should throw error for non-existent kelas', async () => {
      await expect(deleteKelas(999)).rejects.toThrow(/kelas not found/i);
    });
  });

  describe('getAllKelas', () => {
    it('should return empty array when no kelas exist', async () => {
      const result = await getAllKelas();
      expect(result).toEqual([]);
    });

    it('should return all kelas', async () => {
      // Create multiple kelas
      const kelas1 = await createKelas({
        nama_kelas: 'X-A',
        wali_kelas_id: testGuruId
      });

      // Create second guru for second kelas
      const user2Result = await db.insert(usersTable)
        .values({
          ...testUser,
          nip: 'NIP789012'
        })
        .returning()
        .execute();

      const guru2Result = await db.insert(guruTable)
        .values({
          ...testGuru,
          user_id: user2Result[0].id,
          nip: 'NIP789012',
          nama: 'Second Guru'
        })
        .returning()
        .execute();

      const kelas2 = await createKelas({
        nama_kelas: 'X-B',
        wali_kelas_id: guru2Result[0].id
      });

      const result = await getAllKelas();

      expect(result).toHaveLength(2);
      expect(result.map(k => k.nama_kelas)).toContain('X-A');
      expect(result.map(k => k.nama_kelas)).toContain('X-B');
    });
  });

  describe('getKelasByWaliKelas', () => {
    it('should return empty array when guru has no kelas', async () => {
      // Create second guru with no kelas
      const user2Result = await db.insert(usersTable)
        .values({
          ...testUser,
          nip: 'NIP789012'
        })
        .returning()
        .execute();

      const guru2Result = await db.insert(guruTable)
        .values({
          ...testGuru,
          user_id: user2Result[0].id,
          nip: 'NIP789012',
          nama: 'Second Guru'
        })
        .returning()
        .execute();

      const result = await getKelasByWaliKelas(guru2Result[0].id);
      expect(result).toEqual([]);
    });

    it('should return kelas managed by specific guru', async () => {
      // Create kelas for test guru
      const kelas1 = await createKelas({
        nama_kelas: 'X-A',
        wali_kelas_id: testGuruId
      });

      const kelas2 = await createKelas({
        nama_kelas: 'X-B',
        wali_kelas_id: testGuruId
      });

      const result = await getKelasByWaliKelas(testGuruId);

      expect(result).toHaveLength(2);
      expect(result.every(k => k.wali_kelas_id === testGuruId)).toBe(true);
      expect(result.map(k => k.nama_kelas).sort()).toEqual(['X-A', 'X-B']);
    });
  });

  describe('getKelasById', () => {
    it('should return null for non-existent kelas', async () => {
      const result = await getKelasById(999);
      expect(result).toBeNull();
    });

    it('should return kelas by id', async () => {
      const kelas = await createKelas({
        nama_kelas: 'X-A',
        wali_kelas_id: testGuruId
      });

      const result = await getKelasById(kelas.id);

      expect(result).not.toBeNull();
      expect(result?.id).toEqual(kelas.id);
      expect(result?.nama_kelas).toEqual('X-A');
      expect(result?.wali_kelas_id).toEqual(testGuruId);
    });
  });
});