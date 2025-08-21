import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB } from '../helpers';
import { db } from '../db';
import { guruTable, usersTable, roleEnum } from '../db/schema';
import { type CreateGuruInput, type UpdateGuruInput } from '../schema';
import { createGuru, updateGuru, deleteGuru, getAllGuru, getGuruById } from '../handlers/guru';
import { eq, sql } from 'drizzle-orm';

// Test data
const testUser = {
  username: null,
  nip: 'G123456789',
  nisn: null,
  password_hash: 'hashed_password',
  role: 'guru' as const
};

const testUserAdmin = {
  username: 'admin_user',
  nip: null,
  nisn: null,
  password_hash: 'hashed_password',
  role: 'admin' as const
};

const testGuruInput: CreateGuruInput = {
  user_id: 0, // Will be set after user creation
  nip: 'G123456789',
  nama: 'Dr. Ahmad Guru',
  foto: 'photo.jpg'
};

// Custom setup that only creates tables needed for guru tests
const createGuruTestDB = async () => {
  // Create role enum first
  await db.execute(sql`CREATE TYPE role AS ENUM ('admin', 'guru', 'siswa')`);
  
  // Create users table
  await db.execute(sql`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      username TEXT,
      nip TEXT,
      nisn TEXT,
      password_hash TEXT NOT NULL,
      role role NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  
  // Create guru table
  await db.execute(sql`
    CREATE TABLE guru (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nip TEXT NOT NULL UNIQUE,
      nama TEXT NOT NULL,
      foto TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
};

describe('createGuru', () => {
  beforeEach(createGuruTestDB);
  afterEach(resetDB);

  it('should create a guru successfully', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const input = { ...testGuruInput, user_id: userResult[0].id };
    const result = await createGuru(input);

    expect(result.user_id).toEqual(userResult[0].id);
    expect(result.nip).toEqual('G123456789');
    expect(result.nama).toEqual('Dr. Ahmad Guru');
    expect(result.foto).toEqual('photo.jpg');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save guru to database', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const input = { ...testGuruInput, user_id: userResult[0].id };
    const result = await createGuru(input);

    const gurus = await db.select()
      .from(guruTable)
      .where(eq(guruTable.id, result.id))
      .execute();

    expect(gurus).toHaveLength(1);
    expect(gurus[0].nama).toEqual('Dr. Ahmad Guru');
    expect(gurus[0].nip).toEqual('G123456789');
    expect(gurus[0].user_id).toEqual(userResult[0].id);
  });

  it('should throw error if user not found', async () => {
    const input = { ...testGuruInput, user_id: 999 };

    expect(createGuru(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error if user is not guru role', async () => {
    // Create admin user
    const userResult = await db.insert(usersTable)
      .values(testUserAdmin)
      .returning()
      .execute();

    const input = { ...testGuruInput, user_id: userResult[0].id };

    expect(createGuru(input)).rejects.toThrow(/user must have guru role/i);
  });

  it('should throw error if guru profile already exists for user', async () => {
    // Create user and guru
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const input = { ...testGuruInput, user_id: userResult[0].id };
    await createGuru(input);

    // Try to create another guru for same user
    const duplicateInput = { ...testGuruInput, user_id: userResult[0].id, nip: 'G987654321' };
    expect(createGuru(duplicateInput)).rejects.toThrow(/guru profile already exists/i);
  });

  it('should throw error if NIP already exists', async () => {
    // Create first user and guru
    const userResult1 = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const input1 = { ...testGuruInput, user_id: userResult1[0].id };
    await createGuru(input1);

    // Create second user
    const userResult2 = await db.insert(usersTable)
      .values({ ...testUser, nip: 'G987654321' })
      .returning()
      .execute();

    // Try to create guru with duplicate NIP
    const input2 = { ...testGuruInput, user_id: userResult2[0].id, nip: 'G123456789' };
    expect(createGuru(input2)).rejects.toThrow(/nip already exists/i);
  });

  it('should handle null foto value', async () => {
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const input = { ...testGuruInput, user_id: userResult[0].id, foto: null };
    const result = await createGuru(input);

    expect(result.foto).toBeNull();
  });
});

describe('updateGuru', () => {
  beforeEach(createGuruTestDB);
  afterEach(resetDB);

  it('should update guru successfully', async () => {
    // Create user and guru
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createInput = { ...testGuruInput, user_id: userResult[0].id };
    const guru = await createGuru(createInput);

    const updateInput: UpdateGuruInput = {
      id: guru.id,
      nama: 'Dr. Ahmad Updated',
      foto: 'new_photo.jpg'
    };

    const result = await updateGuru(updateInput);

    expect(result.id).toEqual(guru.id);
    expect(result.nama).toEqual('Dr. Ahmad Updated');
    expect(result.foto).toEqual('new_photo.jpg');
    expect(result.nip).toEqual('G123456789'); // Should remain unchanged
    expect(result.updated_at).not.toEqual(guru.updated_at);
  });

  it('should update only provided fields', async () => {
    // Create user and guru
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createInput = { ...testGuruInput, user_id: userResult[0].id };
    const guru = await createGuru(createInput);

    const updateInput: UpdateGuruInput = {
      id: guru.id,
      nama: 'Dr. Ahmad Partial Update'
    };

    const result = await updateGuru(updateInput);

    expect(result.nama).toEqual('Dr. Ahmad Partial Update');
    expect(result.foto).toEqual('photo.jpg'); // Should remain unchanged
  });

  it('should throw error if guru not found', async () => {
    const updateInput: UpdateGuruInput = {
      id: 999,
      nama: 'Non-existent Guru'
    };

    expect(updateGuru(updateInput)).rejects.toThrow(/guru not found/i);
  });

  it('should handle null foto update', async () => {
    // Create user and guru
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createInput = { ...testGuruInput, user_id: userResult[0].id };
    const guru = await createGuru(createInput);

    const updateInput: UpdateGuruInput = {
      id: guru.id,
      foto: null
    };

    const result = await updateGuru(updateInput);

    expect(result.foto).toBeNull();
  });
});

describe('deleteGuru', () => {
  beforeEach(createGuruTestDB);
  afterEach(resetDB);

  it('should delete guru successfully', async () => {
    // Create user and guru
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createInput = { ...testGuruInput, user_id: userResult[0].id };
    const guru = await createGuru(createInput);

    const result = await deleteGuru(guru.id);

    expect(result.success).toBe(true);
    expect(result.message).toEqual('Guru deleted successfully');

    // Verify guru is deleted from database
    const gurus = await db.select()
      .from(guruTable)
      .where(eq(guruTable.id, guru.id))
      .execute();

    expect(gurus).toHaveLength(0);
  });

  it('should throw error if guru not found', async () => {
    expect(deleteGuru(999)).rejects.toThrow(/guru not found/i);
  });
});

describe('getAllGuru', () => {
  beforeEach(createGuruTestDB);
  afterEach(resetDB);

  it('should return empty array when no gurus exist', async () => {
    const result = await getAllGuru();
    expect(result).toEqual([]);
  });

  it('should return all gurus', async () => {
    // Create multiple users and gurus
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({ ...testUser, nip: 'G987654321' })
      .returning()
      .execute();

    const guru1Input = { ...testGuruInput, user_id: user1Result[0].id };
    const guru2Input = { ...testGuruInput, user_id: user2Result[0].id, nip: 'G987654321', nama: 'Dr. Sari Guru' };

    await createGuru(guru1Input);
    await createGuru(guru2Input);

    const result = await getAllGuru();

    expect(result).toHaveLength(2);
    expect(result[0].nama).toEqual('Dr. Ahmad Guru');
    expect(result[1].nama).toEqual('Dr. Sari Guru');
  });
});

describe('getGuruById', () => {
  beforeEach(createGuruTestDB);
  afterEach(resetDB);

  it('should return guru by ID', async () => {
    // Create user and guru
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createInput = { ...testGuruInput, user_id: userResult[0].id };
    const guru = await createGuru(createInput);

    const result = await getGuruById(guru.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(guru.id);
    expect(result!.nama).toEqual('Dr. Ahmad Guru');
    expect(result!.nip).toEqual('G123456789');
    expect(result!.user_id).toEqual(userResult[0].id);
  });

  it('should return null if guru not found', async () => {
    const result = await getGuruById(999);
    expect(result).toBeNull();
  });

  it('should return guru with all fields', async () => {
    // Create user and guru
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createInput = { ...testGuruInput, user_id: userResult[0].id };
    const guru = await createGuru(createInput);

    const result = await getGuruById(guru.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBeDefined();
    expect(result!.user_id).toBeDefined();
    expect(result!.nip).toBeDefined();
    expect(result!.nama).toBeDefined();
    expect(result!.foto).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });
});