import { db } from '../db';
import { absensiTable, siswaTable, kelasTable, guruTable } from '../db/schema';
import { 
    type CreateAbsensiInput, 
    type UpdateAbsensiInput, 
    type AbsenMasukInput,
    type AbsenPulangInput,
    type GetAbsensiHistoryInput,
    type Absensi 
} from '../schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export async function createAbsensi(input: CreateAbsensiInput): Promise<Absensi> {
    try {
        // Validate siswa exists
        const siswa = await db.select()
            .from(siswaTable)
            .where(eq(siswaTable.id, input.siswa_id))
            .execute();
        
        if (siswa.length === 0) {
            throw new Error('Siswa not found');
        }

        // Validate kelas exists
        const kelas = await db.select()
            .from(kelasTable)
            .where(eq(kelasTable.id, input.kelas_id))
            .execute();
        
        if (kelas.length === 0) {
            throw new Error('Kelas not found');
        }

        // Validate guru exists if provided
        if (input.guru_id) {
            const guru = await db.select()
                .from(guruTable)
                .where(eq(guruTable.id, input.guru_id))
                .execute();
            
            if (guru.length === 0) {
                throw new Error('Guru not found');
            }
        }

        const result = await db.insert(absensiTable)
            .values({
                siswa_id: input.siswa_id,
                guru_id: input.guru_id,
                kelas_id: input.kelas_id,
                status: input.status,
                tanggal: input.tanggal,
                waktu_masuk: input.waktu_masuk,
                waktu_pulang: input.waktu_pulang,
                keterangan: input.keterangan
            })
            .returning()
            .execute();

        return result[0];
    } catch (error) {
        console.error('Create absensi failed:', error);
        throw error;
    }
}

export async function updateAbsensi(input: UpdateAbsensiInput): Promise<Absensi> {
    try {
        // Check if absensi exists
        const existing = await db.select()
            .from(absensiTable)
            .where(eq(absensiTable.id, input.id))
            .execute();
        
        if (existing.length === 0) {
            throw new Error('Absensi not found');
        }

        const updateData: Partial<typeof absensiTable.$inferInsert> = {
            updated_at: new Date()
        };

        if (input.status !== undefined) {
            updateData.status = input.status;
        }
        if (input.waktu_masuk !== undefined) {
            updateData.waktu_masuk = input.waktu_masuk;
        }
        if (input.waktu_pulang !== undefined) {
            updateData.waktu_pulang = input.waktu_pulang;
        }
        if (input.keterangan !== undefined) {
            updateData.keterangan = input.keterangan;
        }

        const result = await db.update(absensiTable)
            .set(updateData)
            .where(eq(absensiTable.id, input.id))
            .returning()
            .execute();

        return result[0];
    } catch (error) {
        console.error('Update absensi failed:', error);
        throw error;
    }
}

export async function absenMasuk(input: AbsenMasukInput): Promise<Absensi> {
    try {
        // Get siswa details to get kelas_id
        const siswa = await db.select()
            .from(siswaTable)
            .where(eq(siswaTable.id, input.siswa_id))
            .execute();
        
        if (siswa.length === 0) {
            throw new Error('Siswa not found');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Check if absensi already exists for today
        const existingAbsensi = await db.select()
            .from(absensiTable)
            .where(
                and(
                    eq(absensiTable.siswa_id, input.siswa_id),
                    gte(absensiTable.tanggal, today),
                    lte(absensiTable.tanggal, tomorrow)
                )
            )
            .execute();

        const currentTime = new Date().toTimeString().slice(0, 8); // HH:MM:SS format

        if (existingAbsensi.length > 0) {
            // Update existing absensi with waktu_masuk
            const result = await db.update(absensiTable)
                .set({
                    waktu_masuk: currentTime,
                    status: 'hadir',
                    updated_at: new Date()
                })
                .where(eq(absensiTable.id, existingAbsensi[0].id))
                .returning()
                .execute();

            return result[0];
        } else {
            // Create new absensi entry
            const result = await db.insert(absensiTable)
                .values({
                    siswa_id: input.siswa_id,
                    guru_id: null,
                    kelas_id: siswa[0].kelas_id,
                    status: 'hadir',
                    tanggal: new Date(),
                    waktu_masuk: currentTime,
                    waktu_pulang: null,
                    keterangan: null
                })
                .returning()
                .execute();

            return result[0];
        }
    } catch (error) {
        console.error('Absen masuk failed:', error);
        throw error;
    }
}

export async function absenPulang(input: AbsenPulangInput): Promise<Absensi> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find today's absensi entry
        const existingAbsensi = await db.select()
            .from(absensiTable)
            .where(
                and(
                    eq(absensiTable.siswa_id, input.siswa_id),
                    gte(absensiTable.tanggal, today),
                    lte(absensiTable.tanggal, tomorrow)
                )
            )
            .execute();

        if (existingAbsensi.length === 0) {
            throw new Error('No absensi entry found for today. Please absen masuk first.');
        }

        const currentTime = new Date().toTimeString().slice(0, 8); // HH:MM:SS format

        const result = await db.update(absensiTable)
            .set({
                waktu_pulang: currentTime,
                updated_at: new Date()
            })
            .where(eq(absensiTable.id, existingAbsensi[0].id))
            .returning()
            .execute();

        return result[0];
    } catch (error) {
        console.error('Absen pulang failed:', error);
        throw error;
    }
}

export async function getAbsensiHistory(input: GetAbsensiHistoryInput): Promise<Absensi[]> {
    try {
        // Start with base query
        const baseQuery = db.select().from(absensiTable);

        // Build conditions array
        const conditions = [];

        if (input.siswa_id !== undefined) {
            conditions.push(eq(absensiTable.siswa_id, input.siswa_id));
        }

        if (input.kelas_id !== undefined) {
            conditions.push(eq(absensiTable.kelas_id, input.kelas_id));
        }

        if (input.start_date !== undefined) {
            conditions.push(gte(absensiTable.tanggal, input.start_date));
        }

        if (input.end_date !== undefined) {
            conditions.push(lte(absensiTable.tanggal, input.end_date));
        }

        // Apply conditions to query
        let query;
        if (conditions.length === 0) {
            query = baseQuery;
        } else if (conditions.length === 1) {
            query = baseQuery.where(conditions[0]);
        } else {
            query = baseQuery.where(and(...conditions));
        }

        // Apply ordering and pagination
        const results = await query
            .orderBy(desc(absensiTable.tanggal))
            .limit(input.limit)
            .offset(input.offset)
            .execute();

        return results;
    } catch (error) {
        console.error('Get absensi history failed:', error);
        throw error;
    }
}

export async function getTodayAbsensi(siswaId?: number, kelasId?: number): Promise<Absensi[]> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Start with base query
        const baseQuery = db.select().from(absensiTable);

        // Build conditions array - always include date range
        const conditions = [
            gte(absensiTable.tanggal, today),
            lte(absensiTable.tanggal, tomorrow)
        ];

        if (siswaId !== undefined) {
            conditions.push(eq(absensiTable.siswa_id, siswaId));
        }

        if (kelasId !== undefined) {
            conditions.push(eq(absensiTable.kelas_id, kelasId));
        }

        // Apply conditions and execute
        const results = await baseQuery
            .where(and(...conditions))
            .orderBy(desc(absensiTable.created_at))
            .execute();

        return results;
    } catch (error) {
        console.error('Get today absensi failed:', error);
        throw error;
    }
}

export async function getAbsensiStats(kelasId?: number, startDate?: Date, endDate?: Date): Promise<{
    hadir: number;
    izin: number;
    sakit: number;
    alpha: number;
}> {
    try {
        // Start with base query for stats
        const baseQuery = db.select({
            status: absensiTable.status,
            count: sql<number>`count(*)::int`
        }).from(absensiTable);

        // Build conditions array
        const conditions = [];

        if (kelasId !== undefined) {
            conditions.push(eq(absensiTable.kelas_id, kelasId));
        }

        if (startDate !== undefined) {
            conditions.push(gte(absensiTable.tanggal, startDate));
        }

        if (endDate !== undefined) {
            conditions.push(lte(absensiTable.tanggal, endDate));
        }

        // Apply conditions to query
        let query;
        if (conditions.length === 0) {
            query = baseQuery;
        } else if (conditions.length === 1) {
            query = baseQuery.where(conditions[0]);
        } else {
            query = baseQuery.where(and(...conditions));
        }

        // Execute query with grouping
        const results = await query
            .groupBy(absensiTable.status)
            .execute();

        // Initialize stats
        const stats = {
            hadir: 0,
            izin: 0,
            sakit: 0,
            alpha: 0
        };

        // Populate stats from results
        results.forEach(result => {
            stats[result.status] = result.count;
        });

        return stats;
    } catch (error) {
        console.error('Get absensi stats failed:', error);
        throw error;
    }
}

export async function deleteAbsensi(id: number): Promise<{ success: boolean; message: string }> {
    try {
        // Check if absensi exists
        const existing = await db.select()
            .from(absensiTable)
            .where(eq(absensiTable.id, id))
            .execute();
        
        if (existing.length === 0) {
            throw new Error('Absensi not found');
        }

        await db.delete(absensiTable)
            .where(eq(absensiTable.id, id))
            .execute();

        return {
            success: true,
            message: 'Absensi deleted successfully'
        };
    } catch (error) {
        console.error('Delete absensi failed:', error);
        throw error;
    }
}