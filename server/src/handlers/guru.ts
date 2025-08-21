import { db } from '../db';
import { guruTable, usersTable } from '../db/schema';
import { type CreateGuruInput, type UpdateGuruInput, type Guru } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createGuru(input: CreateGuruInput): Promise<Guru> {
  try {
    // Verify that the user exists and has the 'guru' role
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (user[0].role !== 'guru') {
      throw new Error('User must have guru role');
    }

    // Check if guru profile already exists for this user
    const existingGuru = await db.select()
      .from(guruTable)
      .where(eq(guruTable.user_id, input.user_id))
      .execute();

    if (existingGuru.length > 0) {
      throw new Error('Guru profile already exists for this user');
    }

    // Check NIP uniqueness
    const existingNip = await db.select()
      .from(guruTable)
      .where(eq(guruTable.nip, input.nip))
      .execute();

    if (existingNip.length > 0) {
      throw new Error('NIP already exists');
    }

    // Insert guru record
    const result = await db.insert(guruTable)
      .values({
        user_id: input.user_id,
        nip: input.nip,
        nama: input.nama,
        foto: input.foto
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Guru creation failed:', error);
    throw error;
  }
}

export async function updateGuru(input: UpdateGuruInput): Promise<Guru> {
  try {
    // Verify guru exists
    const existingGuru = await db.select()
      .from(guruTable)
      .where(eq(guruTable.id, input.id))
      .execute();

    if (existingGuru.length === 0) {
      throw new Error('Guru not found');
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof guruTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.nama !== undefined) {
      updateData.nama = input.nama;
    }

    if (input.foto !== undefined) {
      updateData.foto = input.foto;
    }

    // Update guru record
    const result = await db.update(guruTable)
      .set(updateData)
      .where(eq(guruTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Guru update failed:', error);
    throw error;
  }
}

export async function deleteGuru(id: number): Promise<{ success: boolean; message: string }> {
  try {
    // Check if guru exists
    const existingGuru = await db.select()
      .from(guruTable)
      .where(eq(guruTable.id, id))
      .execute();

    if (existingGuru.length === 0) {
      throw new Error('Guru not found');
    }

    // Delete guru record (cascade will handle related records)
    await db.delete(guruTable)
      .where(eq(guruTable.id, id))
      .execute();

    return {
      success: true,
      message: 'Guru deleted successfully'
    };
  } catch (error) {
    console.error('Guru deletion failed:', error);
    throw error;
  }
}

export async function getAllGuru(): Promise<Guru[]> {
  try {
    const result = await db.select()
      .from(guruTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Get all guru failed:', error);
    throw error;
  }
}

export async function getGuruById(id: number): Promise<Guru | null> {
  try {
    const result = await db.select()
      .from(guruTable)
      .where(eq(guruTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Get guru by ID failed:', error);
    throw error;
  }
}