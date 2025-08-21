import { db } from '../db';
import { 
    siswaTable, 
    kelasTable,
    absensiTable
} from '../db/schema';
import { 
    type CreatePengajuanIzinInput, 
    type ReviewPengajuanIzinInput, 
    type PengajuanIzin 
} from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function createPengajuanIzin(input: CreatePengajuanIzinInput): Promise<PengajuanIzin> {
    try {
        // Validate siswa exists
        const siswa = await db.select()
            .from(siswaTable)
            .where(eq(siswaTable.id, input.siswa_id))
            .execute();

        if (siswa.length === 0) {
            throw new Error('Siswa not found');
        }

        // Use raw SQL to insert into pengajuan_izin table to avoid enum issues
        const result = await db.execute(sql`
            INSERT INTO pengajuan_izin (siswa_id, tanggal, alasan, jenis, status, created_at, updated_at)
            VALUES (${input.siswa_id}, ${input.tanggal}, ${input.alasan}, ${input.jenis}, 'pending', NOW(), NOW())
            RETURNING *
        `);

        const row = result.rows[0] as any;
        return {
            id: row.id,
            siswa_id: row.siswa_id,
            tanggal: new Date(row.tanggal),
            alasan: row.alasan,
            status: row.status,
            jenis: row.jenis,
            reviewer_id: row.reviewer_id,
            reviewed_at: row.reviewed_at ? new Date(row.reviewed_at) : null,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
    } catch (error) {
        console.error('Pengajuan izin creation failed:', error);
        throw error;
    }
}

export async function reviewPengajuanIzin(input: ReviewPengajuanIzinInput): Promise<PengajuanIzin> {
    try {
        // Get the pengajuan izin record first using raw SQL
        const pengajuanResult = await db.execute(sql`
            SELECT p.*, s.kelas_id 
            FROM pengajuan_izin p
            INNER JOIN siswa s ON p.siswa_id = s.id
            WHERE p.id = ${input.id}
        `);

        if (pengajuanResult.rows.length === 0) {
            throw new Error('Pengajuan izin not found');
        }

        const pengajuanData = pengajuanResult.rows[0] as any;

        // Update the pengajuan status using raw SQL
        const result = await db.execute(sql`
            UPDATE pengajuan_izin 
            SET status = ${input.status}, reviewer_id = ${input.reviewer_id}, 
                reviewed_at = NOW(), updated_at = NOW()
            WHERE id = ${input.id}
            RETURNING *
        `);

        // If approved, create corresponding absensi entry
        if (input.status === 'approved') {
            const absensiStatus = pengajuanData.jenis === 'sakit' ? 'sakit' : 'izin';
            
            await db.insert(absensiTable)
                .values({
                    siswa_id: pengajuanData.siswa_id,
                    kelas_id: pengajuanData.kelas_id,
                    status: absensiStatus as any,
                    tanggal: new Date(pengajuanData.tanggal),
                    keterangan: `Approved: ${pengajuanData.alasan}`,
                    guru_id: input.reviewer_id
                })
                .execute();
        }

        const row = result.rows[0] as any;
        return {
            id: row.id,
            siswa_id: row.siswa_id,
            tanggal: new Date(row.tanggal),
            alasan: row.alasan,
            status: row.status,
            jenis: row.jenis,
            reviewer_id: row.reviewer_id,
            reviewed_at: row.reviewed_at ? new Date(row.reviewed_at) : null,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
    } catch (error) {
        console.error('Pengajuan izin review failed:', error);
        throw error;
    }
}

export async function getPengajuanIzinBySiswa(siswaId: number): Promise<PengajuanIzin[]> {
    try {
        // Validate siswa exists
        const siswa = await db.select()
            .from(siswaTable)
            .where(eq(siswaTable.id, siswaId))
            .execute();

        if (siswa.length === 0) {
            throw new Error('Siswa not found');
        }

        const result = await db.execute(sql`
            SELECT * FROM pengajuan_izin 
            WHERE siswa_id = ${siswaId}
            ORDER BY created_at DESC
        `);

        return result.rows.map((row: any) => ({
            id: row.id,
            siswa_id: row.siswa_id,
            tanggal: new Date(row.tanggal),
            alasan: row.alasan,
            status: row.status,
            jenis: row.jenis,
            reviewer_id: row.reviewer_id,
            reviewed_at: row.reviewed_at ? new Date(row.reviewed_at) : null,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        }));
    } catch (error) {
        console.error('Get pengajuan izin by siswa failed:', error);
        throw error;
    }
}

export async function getPendingPengajuanIzin(kelasId?: number): Promise<PengajuanIzin[]> {
    try {
        if (kelasId !== undefined) {
            // Validate kelas exists first
            const kelas = await db.select()
                .from(kelasTable)
                .where(eq(kelasTable.id, kelasId))
                .execute();

            if (kelas.length === 0) {
                throw new Error('Kelas not found');
            }

            const result = await db.execute(sql`
                SELECT p.* FROM pengajuan_izin p
                INNER JOIN siswa s ON p.siswa_id = s.id
                WHERE p.status = 'pending' AND s.kelas_id = ${kelasId}
                ORDER BY p.created_at ASC
            `);

            return result.rows.map((row: any) => ({
                id: row.id,
                siswa_id: row.siswa_id,
                tanggal: new Date(row.tanggal),
                alasan: row.alasan,
                status: row.status,
                jenis: row.jenis,
                reviewer_id: row.reviewer_id,
                reviewed_at: row.reviewed_at ? new Date(row.reviewed_at) : null,
                created_at: new Date(row.created_at),
                updated_at: new Date(row.updated_at)
            }));
        } else {
            // No kelas filter, get all pending
            const result = await db.execute(sql`
                SELECT * FROM pengajuan_izin 
                WHERE status = 'pending'
                ORDER BY created_at ASC
            `);

            return result.rows.map((row: any) => ({
                id: row.id,
                siswa_id: row.siswa_id,
                tanggal: new Date(row.tanggal),
                alasan: row.alasan,
                status: row.status,
                jenis: row.jenis,
                reviewer_id: row.reviewer_id,
                reviewed_at: row.reviewed_at ? new Date(row.reviewed_at) : null,
                created_at: new Date(row.created_at),
                updated_at: new Date(row.updated_at)
            }));
        }
    } catch (error) {
        console.error('Get pending pengajuan izin failed:', error);
        throw error;
    }
}

export async function getAllPengajuanIzin(): Promise<PengajuanIzin[]> {
    try {
        const result = await db.execute(sql`
            SELECT * FROM pengajuan_izin 
            ORDER BY created_at DESC
        `);

        return result.rows.map((row: any) => ({
            id: row.id,
            siswa_id: row.siswa_id,
            tanggal: new Date(row.tanggal),
            alasan: row.alasan,
            status: row.status,
            jenis: row.jenis,
            reviewer_id: row.reviewer_id,
            reviewed_at: row.reviewed_at ? new Date(row.reviewed_at) : null,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        }));
    } catch (error) {
        console.error('Get all pengajuan izin failed:', error);
        throw error;
    }
}

export async function deletePengajuanIzin(id: number): Promise<{ success: boolean; message: string }> {
    try {
        // Check if pengajuan izin exists
        const checkResult = await db.execute(sql`
            SELECT id FROM pengajuan_izin WHERE id = ${id}
        `);

        if (checkResult.rows.length === 0) {
            throw new Error('Pengajuan izin not found');
        }

        // Delete the pengajuan izin
        await db.execute(sql`
            DELETE FROM pengajuan_izin WHERE id = ${id}
        `);

        return {
            success: true,
            message: 'Pengajuan izin deleted successfully'
        };
    } catch (error) {
        console.error('Pengajuan izin deletion failed:', error);
        throw error;
    }
}