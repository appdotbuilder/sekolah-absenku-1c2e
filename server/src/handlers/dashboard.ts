import { db } from '../db';
import { usersTable, siswaTable, guruTable, kelasTable, absensiTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { count, eq, and, gte, lte, sql } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total counts
    const [totalSiswaResult] = await db.select({ count: count() }).from(siswaTable).execute();
    const [totalGuruResult] = await db.select({ count: count() }).from(guruTable).execute();
    const [totalKelasResult] = await db.select({ count: count() }).from(kelasTable).execute();

    // Get today's attendance by status
    const absensiHariIni = await db.select({
      status: absensiTable.status,
      count: count()
    })
    .from(absensiTable)
    .where(and(
      gte(absensiTable.tanggal, today),
      lte(absensiTable.tanggal, tomorrow)
    ))
    .groupBy(absensiTable.status)
    .execute();

    // Get pending leave requests - temporarily disabled due to schema enum issue
    // const [pengajuanPendingResult] = await db.select({ count: count() })
    //   .from(pengajuanIzinTable)
    //   .where(eq(pengajuanIzinTable.status, 'pending'))
    //   .execute();
    const pengajuanPendingResult = { count: 0 };

    // Process attendance data
    const attendanceStats = {
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpha: 0
    };

    absensiHariIni.forEach(item => {
      attendanceStats[item.status as keyof typeof attendanceStats] = item.count;
    });

    return {
      total_siswa: totalSiswaResult.count,
      total_guru: totalGuruResult.count,
      total_kelas: totalKelasResult.count,
      absensi_hari_ini: attendanceStats,
      pengajuan_pending: pengajuanPendingResult.count
    };
  } catch (error) {
    console.error('Dashboard stats calculation failed:', error);
    throw error;
  }
}

export async function getGuruDashboardStats(guruId: number): Promise<{
  total_siswa_kelas: number;
  absensi_hari_ini: {
    hadir: number;
    izin: number;
    sakit: number;
    alpha: number;
  };
  pengajuan_pending: number;
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total students in classes where this guru is wali kelas
    const [totalSiswaKelasResult] = await db.select({ count: count() })
      .from(siswaTable)
      .innerJoin(kelasTable, eq(siswaTable.kelas_id, kelasTable.id))
      .where(eq(kelasTable.wali_kelas_id, guruId))
      .execute();

    // Get today's attendance for students in guru's classes
    const absensiHariIni = await db.select({
      status: absensiTable.status,
      count: count()
    })
    .from(absensiTable)
    .innerJoin(siswaTable, eq(absensiTable.siswa_id, siswaTable.id))
    .innerJoin(kelasTable, eq(siswaTable.kelas_id, kelasTable.id))
    .where(and(
      eq(kelasTable.wali_kelas_id, guruId),
      gte(absensiTable.tanggal, today),
      lte(absensiTable.tanggal, tomorrow)
    ))
    .groupBy(absensiTable.status)
    .execute();

    // Get pending leave requests from students in guru's classes - temporarily disabled due to schema enum issue
    // const [pengajuanPendingResult] = await db.select({ count: count() })
    //   .from(pengajuanIzinTable)
    //   .innerJoin(siswaTable, eq(pengajuanIzinTable.siswa_id, siswaTable.id))
    //   .innerJoin(kelasTable, eq(siswaTable.kelas_id, kelasTable.id))
    //   .where(and(
    //     eq(kelasTable.wali_kelas_id, guruId),
    //     eq(pengajuanIzinTable.status, 'pending')
    //   ))
    //   .execute();
    const pengajuanPendingResult = { count: 0 };

    // Process attendance data
    const attendanceStats = {
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpha: 0
    };

    absensiHariIni.forEach(item => {
      attendanceStats[item.status as keyof typeof attendanceStats] = item.count;
    });

    return {
      total_siswa_kelas: totalSiswaKelasResult.count,
      absensi_hari_ini: attendanceStats,
      pengajuan_pending: pengajuanPendingResult.count
    };
  } catch (error) {
    console.error('Guru dashboard stats calculation failed:', error);
    throw error;
  }
}

export async function getSiswaDashboardStats(siswaId: number): Promise<{
  absensi_bulan_ini: {
    hadir: number;
    izin: number;
    sakit: number;
    alpha: number;
  };
  pengajuan_pending: number;
  absensi_hari_ini: {
    status: string | null;
    waktu_masuk: string | null;
    waktu_pulang: string | null;
  };
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get start of current month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    // Get this month's attendance by status
    const absensibulanIni = await db.select({
      status: absensiTable.status,
      count: count()
    })
    .from(absensiTable)
    .where(and(
      eq(absensiTable.siswa_id, siswaId),
      gte(absensiTable.tanggal, startOfMonth),
      lte(absensiTable.tanggal, endOfMonth)
    ))
    .groupBy(absensiTable.status)
    .execute();

    // Get pending leave requests for this student - temporarily disabled due to schema enum issue
    // const [pengajuanPendingResult] = await db.select({ count: count() })
    //   .from(pengajuanIzinTable)
    //   .where(and(
    //     eq(pengajuanIzinTable.siswa_id, siswaId),
    //     eq(pengajuanIzinTable.status, 'pending')
    //   ))
    //   .execute();
    const pengajuanPendingResult = { count: 0 };

    // Get today's attendance record
    const todayAttendance = await db.select({
      status: absensiTable.status,
      waktu_masuk: absensiTable.waktu_masuk,
      waktu_pulang: absensiTable.waktu_pulang
    })
    .from(absensiTable)
    .where(and(
      eq(absensiTable.siswa_id, siswaId),
      gte(absensiTable.tanggal, today),
      lte(absensiTable.tanggal, tomorrow)
    ))
    .execute();

    // Process monthly attendance data
    const monthlyAttendanceStats = {
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpha: 0
    };

    absensibulanIni.forEach(item => {
      monthlyAttendanceStats[item.status as keyof typeof monthlyAttendanceStats] = item.count;
    });

    // Process today's attendance
    const todayStats = {
      status: null as string | null,
      waktu_masuk: null as string | null,
      waktu_pulang: null as string | null
    };

    if (todayAttendance.length > 0) {
      const todayRecord = todayAttendance[0];
      todayStats.status = todayRecord.status;
      todayStats.waktu_masuk = todayRecord.waktu_masuk;
      todayStats.waktu_pulang = todayRecord.waktu_pulang;
    }

    return {
      absensi_bulan_ini: monthlyAttendanceStats,
      pengajuan_pending: pengajuanPendingResult.count,
      absensi_hari_ini: todayStats
    };
  } catch (error) {
    console.error('Siswa dashboard stats calculation failed:', error);
    throw error;
  }
}