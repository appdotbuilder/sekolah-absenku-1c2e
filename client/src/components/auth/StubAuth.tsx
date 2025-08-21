// STUB IMPLEMENTATION - This component provides demo login functionality
// In production, this should be replaced with proper backend authentication

import type { LoginInput, AuthResponse } from '../../../../server/src/schema';

// Demo user data - This simulates the database
const DEMO_USERS = [
  // Admin user
  {
    id: 1,
    username: 'admin',
    nip: null as string | null,
    nisn: null as string | null,
    password: 'admin123',
    role: 'admin' as const,
    profile: null
  },
  // Guru user  
  {
    id: 2,
    username: null as string | null,
    nip: '1987654321',
    nisn: null as string | null,
    password: 'guru123',
    role: 'guru' as const,
    profile: {
      id: 1,
      nama: 'Budi Santoso',
      foto: null
    }
  },
  // Siswa user
  {
    id: 3,
    username: null as string | null,
    nip: null as string | null,
    nisn: '1234567890', 
    password: 'siswa123',
    role: 'siswa' as const,
    profile: {
      id: 1,
      nama: 'Ahmad Fajar',
      foto: null,
      kelas_id: 1
    }
  }
];

export function mockLogin(input: LoginInput): Promise<AuthResponse> {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      // Find user based on role and credentials
      const user = DEMO_USERS.find(u => {
        if (input.role === 'admin' && u.role === 'admin') {
          return u.username === input.username && u.password === input.password;
        }
        if (input.role === 'guru' && u.role === 'guru') {
          return u.nip === input.nip && u.password === input.password;
        }
        if (input.role === 'siswa' && u.role === 'siswa') {
          return u.nisn === input.nisn && u.password === input.password;
        }
        return false;
      });

      if (user) {
        resolve({
          success: true,
          user: {
            id: user.id,
            role: user.role,
            username: user.username,
            nip: user.nip,
            nisn: user.nisn,
            profile: user.profile
          },
          message: 'Login berhasil'
        });
      } else {
        resolve({
          success: false,
          user: null,
          message: 'Username/password salah'
        });
      }
    }, 1000);
  });
}