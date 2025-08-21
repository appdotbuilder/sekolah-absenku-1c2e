import { db } from '../db';
import { kelasTable, guruTable, siswaTable } from '../db/schema';
import { type CreateKelasInput, type UpdateKelasInput, type Kelas } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createKelas(input: CreateKelasInput): Promise<Kelas> {
  try {
    // Validate that the wali_kelas_id references an existing guru
    const guru = await db.select()
      .from(guruTable)
      .where(eq(guruTable.id, input.wali_kelas_id))
      .limit(1)
      .execute();

    if (guru.length === 0) {
      throw new Error('Wali kelas (guru) not found');
    }

    // Insert new kelas
    const result = await db.insert(kelasTable)
      .values({
        nama_kelas: input.nama_kelas,
        wali_kelas_id: input.wali_kelas_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Kelas creation failed:', error);
    throw error;
  }
}

export async function updateKelas(input: UpdateKelasInput): Promise<Kelas> {
  try {
    // Build update values object
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.nama_kelas !== undefined) {
      updateValues.nama_kelas = input.nama_kelas;
    }

    if (input.wali_kelas_id !== undefined) {
      // Validate that the wali_kelas_id references an existing guru
      const guru = await db.select()
        .from(guruTable)
        .where(eq(guruTable.id, input.wali_kelas_id))
        .limit(1)
        .execute();

      if (guru.length === 0) {
        throw new Error('Wali kelas (guru) not found');
      }

      updateValues.wali_kelas_id = input.wali_kelas_id;
    }

    // Update the kelas
    const result = await db.update(kelasTable)
      .set(updateValues)
      .where(eq(kelasTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Kelas not found');
    }

    return result[0];
  } catch (error) {
    console.error('Kelas update failed:', error);
    throw error;
  }
}

export async function deleteKelas(id: number): Promise<{ success: boolean; message: string }> {
  try {
    // Check if there are siswa assigned to this kelas
    const siswaCount = await db.select()
      .from(siswaTable)
      .where(eq(siswaTable.kelas_id, id))
      .execute();

    if (siswaCount.length > 0) {
      throw new Error('Cannot delete kelas with assigned students');
    }

    // Delete the kelas
    const result = await db.delete(kelasTable)
      .where(eq(kelasTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Kelas not found');
    }

    return {
      success: true,
      message: 'Kelas deleted successfully'
    };
  } catch (error) {
    console.error('Kelas deletion failed:', error);
    throw error;
  }
}

export async function getAllKelas(): Promise<Kelas[]> {
  try {
    const result = await db.select()
      .from(kelasTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Get all kelas failed:', error);
    throw error;
  }
}

export async function getKelasByWaliKelas(guruId: number): Promise<Kelas[]> {
  try {
    const result = await db.select()
      .from(kelasTable)
      .where(eq(kelasTable.wali_kelas_id, guruId))
      .execute();

    return result;
  } catch (error) {
    console.error('Get kelas by wali kelas failed:', error);
    throw error;
  }
}

export async function getKelasById(id: number): Promise<Kelas | null> {
  try {
    const result = await db.select()
      .from(kelasTable)
      .where(eq(kelasTable.id, id))
      .limit(1)
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Get kelas by id failed:', error);
    throw error;
  }
}