import { db } from '../db';
import { siswaTable, usersTable, kelasTable } from '../db/schema';
import { type CreateSiswaInput, type UpdateSiswaInput, type Siswa } from '../schema';
import { eq } from 'drizzle-orm';

export async function createSiswa(input: CreateSiswaInput): Promise<Siswa> {
  try {
    // Validate that user exists and has role 'siswa'
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();
    
    if (user.length === 0 || user[0].role !== 'siswa') {
      throw new Error('Invalid user_id or user is not a siswa');
    }

    // Validate that kelas exists
    const kelas = await db.select()
      .from(kelasTable)
      .where(eq(kelasTable.id, input.kelas_id))
      .execute();
    
    if (kelas.length === 0) {
      throw new Error('Kelas not found');
    }

    // Check NISN uniqueness
    const existingSiswa = await db.select()
      .from(siswaTable)
      .where(eq(siswaTable.nisn, input.nisn))
      .execute();
    
    if (existingSiswa.length > 0) {
      throw new Error('NISN already exists');
    }

    // Insert siswa record
    const result = await db.insert(siswaTable)
      .values({
        user_id: input.user_id,
        nisn: input.nisn,
        nama: input.nama,
        kelas_id: input.kelas_id,
        foto: input.foto
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Siswa creation failed:', error);
    throw error;
  }
}

export async function updateSiswa(input: UpdateSiswaInput): Promise<Siswa> {
  try {
    // Check if siswa exists
    const existingSiswa = await db.select()
      .from(siswaTable)
      .where(eq(siswaTable.id, input.id))
      .execute();
    
    if (existingSiswa.length === 0) {
      throw new Error('Siswa not found');
    }

    // Validate kelas_id if provided
    if (input.kelas_id) {
      const kelas = await db.select()
        .from(kelasTable)
        .where(eq(kelasTable.id, input.kelas_id))
        .execute();
      
      if (kelas.length === 0) {
        throw new Error('Kelas not found');
      }
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof siswaTable.$inferInsert> = {};
    
    if (input.nama !== undefined) updateData.nama = input.nama;
    if (input.kelas_id !== undefined) updateData.kelas_id = input.kelas_id;
    if (input.foto !== undefined) updateData.foto = input.foto;

    // Update siswa record
    const result = await db.update(siswaTable)
      .set(updateData)
      .where(eq(siswaTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Siswa update failed:', error);
    throw error;
  }
}

export async function deleteSiswa(id: number): Promise<{ success: boolean; message: string }> {
  try {
    // Check if siswa exists
    const existingSiswa = await db.select()
      .from(siswaTable)
      .where(eq(siswaTable.id, id))
      .execute();
    
    if (existingSiswa.length === 0) {
      throw new Error('Siswa not found');
    }

    // Delete siswa record (will cascade to related records)
    await db.delete(siswaTable)
      .where(eq(siswaTable.id, id))
      .execute();

    return {
      success: true,
      message: 'Siswa deleted successfully'
    };
  } catch (error) {
    console.error('Siswa deletion failed:', error);
    throw error;
  }
}

export async function getAllSiswa(): Promise<Siswa[]> {
  try {
    const result = await db.select()
      .from(siswaTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Get all siswa failed:', error);
    throw error;
  }
}

export async function getSiswaByKelas(kelasId: number): Promise<Siswa[]> {
  try {
    // Validate that kelas exists
    const kelas = await db.select()
      .from(kelasTable)
      .where(eq(kelasTable.id, kelasId))
      .execute();
    
    if (kelas.length === 0) {
      throw new Error('Kelas not found');
    }

    const result = await db.select()
      .from(siswaTable)
      .where(eq(siswaTable.kelas_id, kelasId))
      .execute();

    return result;
  } catch (error) {
    console.error('Get siswa by kelas failed:', error);
    throw error;
  }
}

export async function getSiswaById(id: number): Promise<Siswa | null> {
  try {
    const result = await db.select()
      .from(siswaTable)
      .where(eq(siswaTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Get siswa by id failed:', error);
    throw error;
  }
}