import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB } from '../helpers';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { usersTable, siswaTable, guruTable, kelasTable, absensiTable } from '../db/schema';
import { 
    type CreateAbsensiInput, 
    type UpdateAbsensiInput,
    type AbsenMasukInput,
    type AbsenPulangInput,
    type GetAbsensiHistoryInput 
} from '../schema';
import { 
    createAbsensi, 
    updateAbsensi, 
    absenMasuk, 
    absenPulang,
    getAbsensiHistory,
    getTodayAbsensi,
    getAbsensiStats,
    deleteAbsensi
} from '../handlers/absensi';
import { eq } from 'drizzle-orm';

// Custom DB setup that only creates tables we need (avoiding problematic pengajuan_izin table)
const createLimitedDB = async () => {
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`create schema public`);
  await db.execute(sql`drop schema if exists drizzle cascade`);

  // Create enums first
  await db.execute(sql`CREATE TYPE "role" AS ENUM('admin', 'guru', 'siswa')`);
  await db.execute(sql`CREATE TYPE "attendance_status" AS ENUM('hadir', 'izin', 'sakit', 'alpha')`);

  // Create tables in dependency order
  await db.execute(sql`
    CREATE TABLE "users" (
      "id" serial PRIMARY KEY NOT NULL,
      "username" text,
      "nip" text,
      "nisn" text,
      "password_hash" text NOT NULL,
      "role" "role" NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE "guru" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "nip" text NOT NULL,
      "nama" text NOT NULL,
      "foto" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "guru_nip_unique" UNIQUE("nip")
    )
  `);

  await db.execute(sql`
    CREATE TABLE "kelas" (
      "id" serial PRIMARY KEY NOT NULL,
      "nama_kelas" text NOT NULL,
      "wali_kelas_id" integer NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE "siswa" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "nisn" text NOT NULL,
      "nama" text NOT NULL,
      "kelas_id" integer NOT NULL,
      "foto" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "siswa_nisn_unique" UNIQUE("nisn")
    )
  `);

  await db.execute(sql`
    CREATE TABLE "absensi" (
      "id" serial PRIMARY KEY NOT NULL,
      "siswa_id" integer NOT NULL,
      "guru_id" integer,
      "kelas_id" integer NOT NULL,
      "status" "attendance_status" NOT NULL,
      "tanggal" timestamp NOT NULL,
      "waktu_masuk" text,
      "waktu_pulang" text,
      "keterangan" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // Add foreign key constraints
  await db.execute(sql`ALTER TABLE "guru" ADD CONSTRAINT "guru_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action`);
  await db.execute(sql`ALTER TABLE "kelas" ADD CONSTRAINT "kelas_wali_kelas_id_guru_id_fk" FOREIGN KEY ("wali_kelas_id") REFERENCES "guru"("id") ON DELETE no action ON UPDATE no action`);
  await db.execute(sql`ALTER TABLE "siswa" ADD CONSTRAINT "siswa_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action`);
  await db.execute(sql`ALTER TABLE "siswa" ADD CONSTRAINT "siswa_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "kelas"("id") ON DELETE restrict ON UPDATE no action`);
  await db.execute(sql`ALTER TABLE "absensi" ADD CONSTRAINT "absensi_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "siswa"("id") ON DELETE cascade ON UPDATE no action`);
  await db.execute(sql`ALTER TABLE "absensi" ADD CONSTRAINT "absensi_guru_id_guru_id_fk" FOREIGN KEY ("guru_id") REFERENCES "guru"("id") ON DELETE set null ON UPDATE no action`);
  await db.execute(sql`ALTER TABLE "absensi" ADD CONSTRAINT "absensi_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "kelas"("id") ON DELETE restrict ON UPDATE no action`);
};

// Setup test data
const setupTestData = async () => {
  // Create test user for siswa
  const userResult = await db.insert(usersTable)
      .values({
          nisn: '1234567890',
          password_hash: 'hashedpassword123',
          role: 'siswa'
      })
      .returning()
      .execute();

  // Create test user for guru
  const guruUserResult = await db.insert(usersTable)
      .values({
          nip: '1987654321',
          password_hash: 'hashedpassword456',
          role: 'guru'
      })
      .returning()
      .execute();

  // Create test guru
  const guruResult = await db.insert(guruTable)
      .values({
          user_id: guruUserResult[0].id,
          nip: '1987654321',
          nama: 'Test Guru'
      })
      .returning()
      .execute();

  // Create test kelas
  const kelasResult = await db.insert(kelasTable)
      .values({
          nama_kelas: '12 IPA 1',
          wali_kelas_id: guruResult[0].id
      })
      .returning()
      .execute();

  // Create test siswa
  const siswaResult = await db.insert(siswaTable)
      .values({
          user_id: userResult[0].id,
          nisn: '1234567890',
          nama: 'Test Siswa',
          kelas_id: kelasResult[0].id
      })
      .returning()
      .execute();

  return {
    testUserId: userResult[0].id,
    testSiswaId: siswaResult[0].id,
    testGuruId: guruResult[0].id,
    testKelasId: kelasResult[0].id
  };
};

describe('Absensi Handlers', () => {
    let testUserId: number;
    let testSiswaId: number;
    let testGuruId: number;
    let testKelasId: number;

    beforeEach(async () => {
        await createLimitedDB();
        const testData = await setupTestData();
        testUserId = testData.testUserId;
        testSiswaId = testData.testSiswaId;
        testGuruId = testData.testGuruId;
        testKelasId = testData.testKelasId;
    });

    afterEach(resetDB);

    describe('createAbsensi', () => {
        it('should create absensi successfully', async () => {
            const testInput: CreateAbsensiInput = {
                siswa_id: testSiswaId,
                guru_id: testGuruId,
                kelas_id: testKelasId,
                status: 'hadir',
                tanggal: new Date('2024-01-15'),
                waktu_masuk: '07:30:00',
                waktu_pulang: null,
                keterangan: null
            };

            const result = await createAbsensi(testInput);

            expect(result.siswa_id).toBe(testSiswaId);
            expect(result.guru_id).toBe(testGuruId);
            expect(result.kelas_id).toBe(testKelasId);
            expect(result.status).toBe('hadir');
            expect(result.waktu_masuk).toBe('07:30:00');
            expect(result.id).toBeDefined();
            expect(result.created_at).toBeInstanceOf(Date);
        });

        it('should create absensi without guru', async () => {
            const testInput: CreateAbsensiInput = {
                siswa_id: testSiswaId,
                guru_id: null,
                kelas_id: testKelasId,
                status: 'hadir',
                tanggal: new Date('2024-01-15'),
                waktu_masuk: '07:30:00',
                waktu_pulang: null,
                keterangan: null
            };

            const result = await createAbsensi(testInput);

            expect(result.siswa_id).toBe(testSiswaId);
            expect(result.guru_id).toBe(null);
            expect(result.kelas_id).toBe(testKelasId);
            expect(result.status).toBe('hadir');
        });

        it('should save absensi to database', async () => {
            const testInput: CreateAbsensiInput = {
                siswa_id: testSiswaId,
                guru_id: testGuruId,
                kelas_id: testKelasId,
                status: 'hadir',
                tanggal: new Date('2024-01-15'),
                waktu_masuk: '07:30:00',
                waktu_pulang: null,
                keterangan: null
            };

            const result = await createAbsensi(testInput);

            const saved = await db.select()
                .from(absensiTable)
                .where(eq(absensiTable.id, result.id))
                .execute();

            expect(saved).toHaveLength(1);
            expect(saved[0].siswa_id).toBe(testSiswaId);
            expect(saved[0].status).toBe('hadir');
        });

        it('should throw error for invalid siswa_id', async () => {
            const testInput: CreateAbsensiInput = {
                siswa_id: 99999,
                guru_id: null,
                kelas_id: testKelasId,
                status: 'hadir',
                tanggal: new Date('2024-01-15'),
                waktu_masuk: '07:30:00',
                waktu_pulang: null,
                keterangan: null
            };

            await expect(createAbsensi(testInput)).rejects.toThrow(/siswa not found/i);
        });
    });

    describe('updateAbsensi', () => {
        let testAbsensiId: number;

        beforeEach(async () => {
            const absensiResult = await db.insert(absensiTable)
                .values({
                    siswa_id: testSiswaId,
                    guru_id: testGuruId,
                    kelas_id: testKelasId,
                    status: 'alpha',
                    tanggal: new Date('2024-01-15'),
                    waktu_masuk: null,
                    waktu_pulang: null,
                    keterangan: null
                })
                .returning()
                .execute();
            testAbsensiId = absensiResult[0].id;
        });

        it('should update absensi status', async () => {
            const input: UpdateAbsensiInput = {
                id: testAbsensiId,
                status: 'hadir',
                waktu_masuk: '07:45:00'
            };

            const result = await updateAbsensi(input);

            expect(result.id).toBe(testAbsensiId);
            expect(result.status).toBe('hadir');
            expect(result.waktu_masuk).toBe('07:45:00');
            expect(result.updated_at).toBeInstanceOf(Date);
        });

        it('should update absensi waktu pulang', async () => {
            const input: UpdateAbsensiInput = {
                id: testAbsensiId,
                waktu_pulang: '15:30:00',
                keterangan: 'Pulang tepat waktu'
            };

            const result = await updateAbsensi(input);

            expect(result.waktu_pulang).toBe('15:30:00');
            expect(result.keterangan).toBe('Pulang tepat waktu');
        });

        it('should save updates to database', async () => {
            const input: UpdateAbsensiInput = {
                id: testAbsensiId,
                status: 'izin',
                keterangan: 'Sakit demam'
            };

            await updateAbsensi(input);

            const updated = await db.select()
                .from(absensiTable)
                .where(eq(absensiTable.id, testAbsensiId))
                .execute();

            expect(updated[0].status).toBe('izin');
            expect(updated[0].keterangan).toBe('Sakit demam');
        });

        it('should throw error for non-existent absensi', async () => {
            const input: UpdateAbsensiInput = {
                id: 99999,
                status: 'hadir'
            };

            await expect(updateAbsensi(input)).rejects.toThrow(/absensi not found/i);
        });
    });

    describe('absenMasuk', () => {
        it('should create new absensi entry for today', async () => {
            const input: AbsenMasukInput = {
                siswa_id: testSiswaId
            };

            const result = await absenMasuk(input);

            expect(result.siswa_id).toBe(testSiswaId);
            expect(result.kelas_id).toBe(testKelasId);
            expect(result.status).toBe('hadir');
            expect(result.waktu_masuk).toBeDefined();
            expect(result.waktu_masuk).toMatch(/^\d{2}:\d{2}:\d{2}$/); // HH:MM:SS format
            expect(result.waktu_pulang).toBe(null);
        });

        it('should update existing absensi entry for today', async () => {
            // Create existing absensi for today
            const today = new Date();
            await db.insert(absensiTable)
                .values({
                    siswa_id: testSiswaId,
                    guru_id: null,
                    kelas_id: testKelasId,
                    status: 'alpha',
                    tanggal: today,
                    waktu_masuk: null,
                    waktu_pulang: null,
                    keterangan: null
                })
                .returning()
                .execute();

            const input: AbsenMasukInput = {
                siswa_id: testSiswaId
            };

            const result = await absenMasuk(input);

            expect(result.status).toBe('hadir');
            expect(result.waktu_masuk).toBeDefined();
            expect(result.waktu_masuk).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        });

        it('should throw error for invalid siswa_id', async () => {
            const input: AbsenMasukInput = {
                siswa_id: 99999
            };

            await expect(absenMasuk(input)).rejects.toThrow(/siswa not found/i);
        });
    });

    describe('absenPulang', () => {
        beforeEach(async () => {
            // Create absensi masuk for today
            const today = new Date();
            await db.insert(absensiTable)
                .values({
                    siswa_id: testSiswaId,
                    guru_id: null,
                    kelas_id: testKelasId,
                    status: 'hadir',
                    tanggal: today,
                    waktu_masuk: '07:30:00',
                    waktu_pulang: null,
                    keterangan: null
                })
                .returning()
                .execute();
        });

        it('should update existing absensi with waktu pulang', async () => {
            const input: AbsenPulangInput = {
                siswa_id: testSiswaId
            };

            const result = await absenPulang(input);

            expect(result.siswa_id).toBe(testSiswaId);
            expect(result.waktu_masuk).toBe('07:30:00');
            expect(result.waktu_pulang).toBeDefined();
            expect(result.waktu_pulang).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        });

        it('should throw error if no absensi masuk found', async () => {
            // Create another siswa without absensi masuk
            const userResult2 = await db.insert(usersTable)
                .values({
                    nisn: '9876543210',
                    password_hash: 'hashedpassword789',
                    role: 'siswa'
                })
                .returning()
                .execute();

            const siswaResult2 = await db.insert(siswaTable)
                .values({
                    user_id: userResult2[0].id,
                    nisn: '9876543210',
                    nama: 'Test Siswa 2',
                    kelas_id: testKelasId
                })
                .returning()
                .execute();

            const input: AbsenPulangInput = {
                siswa_id: siswaResult2[0].id
            };

            await expect(absenPulang(input)).rejects.toThrow(/no absensi entry found for today/i);
        });
    });

    describe('getAbsensiHistory', () => {
        beforeEach(async () => {
            // Create multiple absensi entries
            const dates = [
                new Date('2024-01-10'),
                new Date('2024-01-11'),
                new Date('2024-01-12')
            ];

            for (const date of dates) {
                await db.insert(absensiTable)
                    .values({
                        siswa_id: testSiswaId,
                        guru_id: testGuruId,
                        kelas_id: testKelasId,
                        status: 'hadir',
                        tanggal: date,
                        waktu_masuk: '07:30:00',
                        waktu_pulang: '15:00:00',
                        keterangan: null
                    })
                    .execute();
            }
        });

        it('should get all absensi history', async () => {
            const input: GetAbsensiHistoryInput = {
                limit: 50,
                offset: 0
            };

            const results = await getAbsensiHistory(input);

            expect(results.length).toBe(3);
            // Should be ordered by tanggal descending
            expect(new Date(results[0].tanggal).getTime()).toBeGreaterThan(
                new Date(results[1].tanggal).getTime()
            );
        });

        it('should filter by siswa_id', async () => {
            const input: GetAbsensiHistoryInput = {
                siswa_id: testSiswaId,
                limit: 50,
                offset: 0
            };

            const results = await getAbsensiHistory(input);

            expect(results.length).toBe(3);
            results.forEach(absensi => {
                expect(absensi.siswa_id).toBe(testSiswaId);
            });
        });

        it('should filter by date range', async () => {
            const input: GetAbsensiHistoryInput = {
                start_date: new Date('2024-01-10'),
                end_date: new Date('2024-01-11'),
                limit: 50,
                offset: 0
            };

            const results = await getAbsensiHistory(input);

            expect(results.length).toBe(2);
            results.forEach(absensi => {
                const absensiDate = new Date(absensi.tanggal);
                expect(absensiDate >= new Date('2024-01-10')).toBe(true);
                expect(absensiDate <= new Date('2024-01-11')).toBe(true);
            });
        });

        it('should respect pagination', async () => {
            const input: GetAbsensiHistoryInput = {
                limit: 2,
                offset: 1
            };

            const results = await getAbsensiHistory(input);

            expect(results.length).toBe(2);
        });
    });

    describe('getTodayAbsensi', () => {
        beforeEach(async () => {
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            // Create today's absensi
            await db.insert(absensiTable)
                .values({
                    siswa_id: testSiswaId,
                    guru_id: testGuruId,
                    kelas_id: testKelasId,
                    status: 'hadir',
                    tanggal: today,
                    waktu_masuk: '07:30:00',
                    waktu_pulang: null,
                    keterangan: null
                })
                .execute();

            // Create yesterday's absensi (should not be included)
            await db.insert(absensiTable)
                .values({
                    siswa_id: testSiswaId,
                    guru_id: testGuruId,
                    kelas_id: testKelasId,
                    status: 'hadir',
                    tanggal: yesterday,
                    waktu_masuk: '07:30:00',
                    waktu_pulang: '15:00:00',
                    keterangan: null
                })
                .execute();
        });

        it('should get today absensi for specific siswa', async () => {
            const results = await getTodayAbsensi(testSiswaId);

            expect(results.length).toBe(1);
            expect(results[0].siswa_id).toBe(testSiswaId);
        });

        it('should get today absensi for specific kelas', async () => {
            const results = await getTodayAbsensi(undefined, testKelasId);

            expect(results.length).toBe(1);
            expect(results[0].kelas_id).toBe(testKelasId);
        });

        it('should get all today absensi', async () => {
            const results = await getTodayAbsensi();

            expect(results.length).toBeGreaterThanOrEqual(1);
            // All results should be from today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            results.forEach(absensi => {
                const absensiDate = new Date(absensi.tanggal);
                absensiDate.setHours(0, 0, 0, 0);
                expect(absensiDate.getTime()).toBeGreaterThanOrEqual(today.getTime());
            });
        });
    });

    describe('getAbsensiStats', () => {
        beforeEach(async () => {
            // Create various absensi entries with different statuses
            const statuses = ['hadir', 'izin', 'sakit', 'alpha'] as const;
            const today = new Date();

            for (let i = 0; i < statuses.length; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);

                await db.insert(absensiTable)
                    .values({
                        siswa_id: testSiswaId,
                        guru_id: testGuruId,
                        kelas_id: testKelasId,
                        status: statuses[i],
                        tanggal: date,
                        waktu_masuk: statuses[i] === 'hadir' ? '07:30:00' : null,
                        waktu_pulang: statuses[i] === 'hadir' ? '15:00:00' : null,
                        keterangan: null
                    })
                    .execute();
            }
        });

        it('should get absensi stats for all data', async () => {
            const stats = await getAbsensiStats();

            expect(typeof stats.hadir).toBe('number');
            expect(typeof stats.izin).toBe('number');
            expect(typeof stats.sakit).toBe('number');
            expect(typeof stats.alpha).toBe('number');
            expect(stats.hadir).toBe(1);
            expect(stats.izin).toBe(1);
            expect(stats.sakit).toBe(1);
            expect(stats.alpha).toBe(1);
        });

        it('should filter stats by kelas', async () => {
            const stats = await getAbsensiStats(testKelasId);

            expect(stats.hadir + stats.izin + stats.sakit + stats.alpha).toBe(4);
        });

        it('should filter stats by date range', async () => {
            // Use fixed dates to ensure consistent results
            const startDate = new Date('2023-12-01');
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 1); // Include today + tomorrow to be safe

            const stats = await getAbsensiStats(undefined, startDate, endDate);

            // Should include all 4 entries we created (hadir, izin, sakit, alpha)
            expect(stats.hadir + stats.izin + stats.sakit + stats.alpha).toBe(4);
        });
    });

    describe('deleteAbsensi', () => {
        let testAbsensiId: number;

        beforeEach(async () => {
            const absensiResult = await db.insert(absensiTable)
                .values({
                    siswa_id: testSiswaId,
                    guru_id: testGuruId,
                    kelas_id: testKelasId,
                    status: 'hadir',
                    tanggal: new Date(),
                    waktu_masuk: '07:30:00',
                    waktu_pulang: '15:00:00',
                    keterangan: null
                })
                .returning()
                .execute();
            testAbsensiId = absensiResult[0].id;
        });

        it('should delete absensi successfully', async () => {
            const result = await deleteAbsensi(testAbsensiId);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Absensi deleted successfully');

            // Verify deletion in database
            const deleted = await db.select()
                .from(absensiTable)
                .where(eq(absensiTable.id, testAbsensiId))
                .execute();

            expect(deleted).toHaveLength(0);
        });

        it('should throw error for non-existent absensi', async () => {
            await expect(deleteAbsensi(99999)).rejects.toThrow(/absensi not found/i);
        });
    });
});