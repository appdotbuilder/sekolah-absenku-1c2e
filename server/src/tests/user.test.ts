import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { createUser, updateUser, deleteUser, getAllUsers } from '../handlers/user';
import { eq } from 'drizzle-orm';
import { pbkdf2Sync } from 'crypto';
import { sql } from 'drizzle-orm';

// Helper function to verify passwords (matches the one in handler)
function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Custom database setup for user tests only
const resetUserDB = async () => {
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`create schema public`);
  await db.execute(sql`drop schema if exists drizzle cascade`);
};

const createUserDB = async () => {
  // Create only the enums and tables needed for user functionality
  await db.execute(sql`CREATE TYPE "role" AS ENUM('admin', 'guru', 'siswa')`);
  
  await db.execute(sql`CREATE TABLE IF NOT EXISTS "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "username" text,
    "nip" text,
    "nisn" text,
    "password_hash" text NOT NULL,
    "role" "role" NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`);
};

describe('User Handlers', () => {
  beforeEach(createUserDB);
  afterEach(resetUserDB);

  describe('createUser', () => {
    it('should create an admin user with username', async () => {
      const input: CreateUserInput = {
        username: 'admin1',
        nip: null,
        nisn: null,
        password: 'password123',
        role: 'admin'
      };

      const result = await createUser(input);

      expect(result.id).toBeDefined();
      expect(result.username).toEqual('admin1');
      expect(result.nip).toBeNull();
      expect(result.nisn).toBeNull();
      expect(result.role).toEqual('admin');
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);

      // Verify password is hashed
      const isValidPassword = verifyPassword('password123', result.password_hash);
      expect(isValidPassword).toBe(true);
    });

    it('should create a guru user with NIP', async () => {
      const input: CreateUserInput = {
        username: null,
        nip: '123456789',
        nisn: null,
        password: 'gurupass',
        role: 'guru'
      };

      const result = await createUser(input);

      expect(result.nip).toEqual('123456789');
      expect(result.username).toBeNull();
      expect(result.nisn).toBeNull();
      expect(result.role).toEqual('guru');

      // Verify password is hashed
      const isValidPassword = verifyPassword('gurupass', result.password_hash);
      expect(isValidPassword).toBe(true);
    });

    it('should create a siswa user with NISN', async () => {
      const input: CreateUserInput = {
        username: null,
        nip: null,
        nisn: '0123456789',
        password: 'siswapass',
        role: 'siswa'
      };

      const result = await createUser(input);

      expect(result.nisn).toEqual('0123456789');
      expect(result.username).toBeNull();
      expect(result.nip).toBeNull();
      expect(result.role).toEqual('siswa');

      // Verify password is hashed
      const isValidPassword = verifyPassword('siswapass', result.password_hash);
      expect(isValidPassword).toBe(true);
    });

    it('should save user to database', async () => {
      const input: CreateUserInput = {
        username: 'testadmin',
        nip: null,
        nisn: null,
        password: 'testpass',
        role: 'admin'
      };

      const result = await createUser(input);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].username).toEqual('testadmin');
      expect(users[0].role).toEqual('admin');
    });

    it('should reject duplicate username for admin', async () => {
      const input1: CreateUserInput = {
        username: 'admin1',
        nip: null,
        nisn: null,
        password: 'password123',
        role: 'admin'
      };

      await createUser(input1);

      const input2: CreateUserInput = {
        username: 'admin1',
        nip: null,
        nisn: null,
        password: 'password456',
        role: 'admin'
      };

      await expect(createUser(input2)).rejects.toThrow(/username already exists/i);
    });

    it('should reject duplicate NIP for guru', async () => {
      const input1: CreateUserInput = {
        username: null,
        nip: '123456789',
        nisn: null,
        password: 'password123',
        role: 'guru'
      };

      await createUser(input1);

      const input2: CreateUserInput = {
        username: null,
        nip: '123456789',
        nisn: null,
        password: 'password456',
        role: 'guru'
      };

      await expect(createUser(input2)).rejects.toThrow(/nip already exists/i);
    });

    it('should reject duplicate NISN for siswa', async () => {
      const input1: CreateUserInput = {
        username: null,
        nip: null,
        nisn: '0123456789',
        password: 'password123',
        role: 'siswa'
      };

      await createUser(input1);

      const input2: CreateUserInput = {
        username: null,
        nip: null,
        nisn: '0123456789',
        password: 'password456',
        role: 'siswa'
      };

      await expect(createUser(input2)).rejects.toThrow(/nisn already exists/i);
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const createInput: CreateUserInput = {
        username: 'originaladmin',
        nip: null,
        nisn: null,
        password: 'originalpass',
        role: 'admin'
      };

      const createdUser = await createUser(createInput);

      const updateInput: UpdateUserInput = {
        id: createdUser.id,
        username: 'updatedadmin',
        role: 'admin'
      };

      const result = await updateUser(updateInput);

      expect(result.id).toEqual(createdUser.id);
      expect(result.username).toEqual('updatedadmin');
      expect(result.role).toEqual('admin');
      expect(result.updated_at.getTime()).toBeGreaterThan(createdUser.updated_at.getTime());
    });

    it('should update password and hash it', async () => {
      const createInput: CreateUserInput = {
        username: 'testuser',
        nip: null,
        nisn: null,
        password: 'originalpass',
        role: 'admin'
      };

      const createdUser = await createUser(createInput);

      const updateInput: UpdateUserInput = {
        id: createdUser.id,
        password: 'newpassword123'
      };

      const result = await updateUser(updateInput);

      // Verify new password is hashed correctly
      const isValidOldPassword = verifyPassword('originalpass', result.password_hash);
      const isValidNewPassword = verifyPassword('newpassword123', result.password_hash);
      
      expect(isValidOldPassword).toBe(false);
      expect(isValidNewPassword).toBe(true);
      expect(result.password_hash).not.toEqual(createdUser.password_hash);
    });

    it('should update partial fields only', async () => {
      const createInput: CreateUserInput = {
        username: null,
        nip: '123456789',
        nisn: null,
        password: 'originalpass',
        role: 'guru'
      };

      const createdUser = await createUser(createInput);

      const updateInput: UpdateUserInput = {
        id: createdUser.id,
        nip: '987654321'
      };

      const result = await updateUser(updateInput);

      expect(result.nip).toEqual('987654321');
      expect(result.role).toEqual('guru'); // Should remain unchanged
      expect(result.password_hash).toEqual(createdUser.password_hash); // Should remain unchanged
    });

    it('should reject update with non-existent user ID', async () => {
      const updateInput: UpdateUserInput = {
        id: 999,
        username: 'nonexistent'
      };

      await expect(updateUser(updateInput)).rejects.toThrow(/user not found/i);
    });

    it('should reject update causing duplicate username', async () => {
      // Create first user
      const input1: CreateUserInput = {
        username: 'admin1',
        nip: null,
        nisn: null,
        password: 'password123',
        role: 'admin'
      };
      await createUser(input1);

      // Create second user
      const input2: CreateUserInput = {
        username: 'admin2',
        nip: null,
        nisn: null,
        password: 'password456',
        role: 'admin'
      };
      const user2 = await createUser(input2);

      // Try to update second user with first user's username
      const updateInput: UpdateUserInput = {
        id: user2.id,
        username: 'admin1'
      };

      await expect(updateUser(updateInput)).rejects.toThrow(/username already exists/i);
    });
  });

  describe('deleteUser', () => {
    it('should delete existing user', async () => {
      const createInput: CreateUserInput = {
        username: 'todelete',
        nip: null,
        nisn: null,
        password: 'password123',
        role: 'admin'
      };

      const createdUser = await createUser(createInput);

      const result = await deleteUser(createdUser.id);

      expect(result.success).toBe(true);
      expect(result.message).toEqual('User deleted successfully');

      // Verify user is removed from database
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, createdUser.id))
        .execute();

      expect(users).toHaveLength(0);
    });

    it('should reject delete with non-existent user ID', async () => {
      await expect(deleteUser(999)).rejects.toThrow(/user not found/i);
    });
  });

  describe('getAllUsers', () => {
    it('should return empty array when no users exist', async () => {
      const result = await getAllUsers();
      expect(result).toHaveLength(0);
    });

    it('should return all users', async () => {
      // Create multiple users
      const inputs: CreateUserInput[] = [
        {
          username: 'admin1',
          nip: null,
          nisn: null,
          password: 'pass1',
          role: 'admin'
        },
        {
          username: null,
          nip: '123456789',
          nisn: null,
          password: 'pass2',
          role: 'guru'
        },
        {
          username: null,
          nip: null,
          nisn: '0123456789',
          password: 'pass3',
          role: 'siswa'
        }
      ];

      for (const input of inputs) {
        await createUser(input);
      }

      const result = await getAllUsers();

      expect(result).toHaveLength(3);
      
      // Check that all roles are represented
      const roles = result.map(user => user.role);
      expect(roles).toContain('admin');
      expect(roles).toContain('guru');
      expect(roles).toContain('siswa');

      // Verify all users have required fields
      result.forEach(user => {
        expect(user.id).toBeDefined();
        expect(user.password_hash).toBeDefined();
        expect(user.role).toBeDefined();
        expect(user.created_at).toBeInstanceOf(Date);
        expect(user.updated_at).toBeInstanceOf(Date);
      });
    });
  });
});