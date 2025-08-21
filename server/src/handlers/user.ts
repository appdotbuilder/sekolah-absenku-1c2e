import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput, type User } from '../schema';
import { eq, or, and } from 'drizzle-orm';
import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

// Helper function to hash passwords
function hashPassword(password: string): string {
  const salt = randomBytes(32).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Helper function to verify passwords
function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash the password
    const password_hash = hashPassword(input.password);

    // Validate unique constraints based on role
    const conditions = [];
    
    if (input.role === 'admin' && input.username !== null) {
      conditions.push(eq(usersTable.username, input.username));
    }
    
    if (input.role === 'guru' && input.nip !== null) {
      conditions.push(eq(usersTable.nip, input.nip));
    }
    
    if (input.role === 'siswa' && input.nisn !== null) {
      conditions.push(eq(usersTable.nisn, input.nisn));
    }

    // Check for existing users with same identifier
    if (conditions.length > 0) {
      const existingUsers = await db.select()
        .from(usersTable)
        .where(or(...conditions))
        .execute();

      if (existingUsers.length > 0) {
        const existing = existingUsers[0];
        let identifier = '';
        
        if (existing.username && existing.username === input.username) identifier = 'Username';
        else if (existing.nip && existing.nip === input.nip) identifier = 'NIP';
        else if (existing.nisn && existing.nisn === input.nisn) identifier = 'NISN';
        
        throw new Error(`${identifier} already exists`);
      }
    }

    // Insert new user
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        nip: input.nip,
        nisn: input.nisn,
        password_hash,
        role: input.role,
        updated_at: new Date()
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function updateUser(input: UpdateUserInput): Promise<User> {
  try {
    // Check if user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error('User not found');
    }

    const user = existingUser[0];

    // Validate unique constraints if changing identifiers
    const conditions = [];
    
    if (input.username !== undefined && input.username !== user.username && input.username !== null) {
      conditions.push(eq(usersTable.username, input.username));
    }
    
    if (input.nip !== undefined && input.nip !== user.nip && input.nip !== null) {
      conditions.push(eq(usersTable.nip, input.nip));
    }
    
    if (input.nisn !== undefined && input.nisn !== user.nisn && input.nisn !== null) {
      conditions.push(eq(usersTable.nisn, input.nisn));
    }

    // Check for conflicts with other users
    if (conditions.length > 0) {
      const conflictingUsers = await db.select()
        .from(usersTable)
        .where(conditions.length === 1 ? conditions[0] : or(...conditions))
        .execute();

      // Filter out the current user from conflicts
      const realConflicts = conflictingUsers.filter(u => u.id !== input.id);
      
      if (realConflicts.length > 0) {
        const conflict = realConflicts[0];
        let identifier = '';
        
        if (conflict.username && conflict.username === input.username) identifier = 'Username';
        else if (conflict.nip && conflict.nip === input.nip) identifier = 'NIP';
        else if (conflict.nisn && conflict.nisn === input.nisn) identifier = 'NISN';
        
        throw new Error(`${identifier} already exists`);
      }
    }

    // Prepare update values
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.username !== undefined) updateValues.username = input.username;
    if (input.nip !== undefined) updateValues.nip = input.nip;
    if (input.nisn !== undefined) updateValues.nisn = input.nisn;
    if (input.role !== undefined) updateValues.role = input.role;
    
    // Hash new password if provided
    if (input.password !== undefined) {
      updateValues.password_hash = hashPassword(input.password);
    }

    // Update user
    const result = await db.update(usersTable)
      .set(updateValues)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}

export async function deleteUser(id: number): Promise<{ success: boolean; message: string }> {
  try {
    // Check if user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error('User not found');
    }

    // Delete user (cascading deletes will handle related records)
    await db.delete(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    return {
      success: true,
      message: 'User deleted successfully'
    };
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const result = await db.select()
      .from(usersTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Get all users failed:', error);
    throw error;
  }
}