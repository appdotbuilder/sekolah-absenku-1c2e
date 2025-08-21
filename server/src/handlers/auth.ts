import { db } from '../db';
import { usersTable, siswaTable, guruTable } from '../db/schema';
import { type LoginInput, type AuthResponse } from '../schema';
import { eq, and } from 'drizzle-orm';
import { createHash, timingSafeEqual } from 'crypto';

export async function login(input: LoginInput): Promise<AuthResponse> {
  try {
    // Validate role-specific credentials
    let whereCondition;
    
    switch (input.role) {
      case 'admin':
        if (!input.username) {
          return {
            success: false,
            user: null,
            message: 'Username is required for admin login'
          };
        }
        whereCondition = and(
          eq(usersTable.role, 'admin'),
          eq(usersTable.username, input.username)
        );
        break;
        
      case 'guru':
        if (!input.nip) {
          return {
            success: false,
            user: null,
            message: 'NIP is required for guru login'
          };
        }
        whereCondition = and(
          eq(usersTable.role, 'guru'),
          eq(usersTable.nip, input.nip)
        );
        break;
        
      case 'siswa':
        if (!input.nisn) {
          return {
            success: false,
            user: null,
            message: 'NISN is required for siswa login'
          };
        }
        whereCondition = and(
          eq(usersTable.role, 'siswa'),
          eq(usersTable.nisn, input.nisn)
        );
        break;
        
      default:
        return {
          success: false,
          user: null,
          message: 'Invalid role specified'
        };
    }

    // Find user by role-specific identifier
    const users = await db.select()
      .from(usersTable)
      .where(whereCondition)
      .execute();

    if (users.length === 0) {
      return {
        success: false,
        user: null,
        message: 'User not found'
      };
    }

    const user = users[0];

    // Verify password - using simple hash comparison for demo
    // In production, use proper password hashing like bcrypt
    const hashedInput = createHash('sha256').update(input.password).digest('hex');
    const isPasswordValid = timingSafeEqual(
      Buffer.from(user.password_hash, 'hex'),
      Buffer.from(hashedInput, 'hex')
    );
    
    if (!isPasswordValid) {
      return {
        success: false,
        user: null,
        message: 'Invalid password'
      };
    }

    // Get user profile data based on role
    const userProfile = await getCurrentUser(user.id);
    
    return {
      success: true,
      user: userProfile,
      message: 'Login successful'
    };

  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function getCurrentUser(userId: number): Promise<AuthResponse['user']> {
  try {
    // Get basic user data
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Get role-specific profile data
    let profile = null;

    if (user.role === 'siswa') {
      const siswaData = await db.select()
        .from(siswaTable)
        .where(eq(siswaTable.user_id, userId))
        .execute();

      if (siswaData.length > 0) {
        const siswa = siswaData[0];
        profile = {
          id: siswa.id,
          nama: siswa.nama,
          foto: siswa.foto,
          kelas_id: siswa.kelas_id
        };
      }
    } else if (user.role === 'guru') {
      const guruData = await db.select()
        .from(guruTable)
        .where(eq(guruTable.user_id, userId))
        .execute();

      if (guruData.length > 0) {
        const guru = guruData[0];
        profile = {
          id: guru.id,
          nama: guru.nama,
          foto: guru.foto
        };
      }
    } else if (user.role === 'admin') {
      // Admin doesn't have additional profile data
      profile = {
        id: user.id,
        nama: user.username || 'Admin',
        foto: null
      };
    }

    return {
      id: user.id,
      role: user.role,
      username: user.username,
      nip: user.nip,
      nisn: user.nisn,
      profile
    };

  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
}