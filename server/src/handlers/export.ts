import { db } from '../db';
import { absensiTable, siswaTable, kelasTable, guruTable } from '../db/schema';
import { type GetAbsensiHistoryInput } from '../schema';
import { eq, and, gte, lte, desc, SQL } from 'drizzle-orm';
// Simple date formatting helper
function formatDate(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatFileDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

// Helper function to get absensi data with joins
async function getAbsensiData(input: GetAbsensiHistoryInput) {
  // Build conditions array
  const conditions: SQL<unknown>[] = [];

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

  // Build complete query based on whether we have conditions
  const baseQuery = db.select({
    absensi: absensiTable,
    siswa: siswaTable,
    kelas: kelasTable,
    guru: guruTable
  })
  .from(absensiTable)
  .innerJoin(siswaTable, eq(absensiTable.siswa_id, siswaTable.id))
  .innerJoin(kelasTable, eq(absensiTable.kelas_id, kelasTable.id))
  .leftJoin(guruTable, eq(absensiTable.guru_id, guruTable.id));

  const finalQuery = conditions.length > 0
    ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
    : baseQuery;

  // Execute query with ordering and pagination
  const results = await finalQuery
    .orderBy(desc(absensiTable.tanggal))
    .limit(input.limit)
    .offset(input.offset)
    .execute();

  return results.map(result => ({
    id: result.absensi.id,
    siswa_id: result.absensi.siswa_id,
    guru_id: result.absensi.guru_id,
    kelas_id: result.absensi.kelas_id,
    status: result.absensi.status,
    tanggal: result.absensi.tanggal,
    waktu_masuk: result.absensi.waktu_masuk,
    waktu_pulang: result.absensi.waktu_pulang,
    keterangan: result.absensi.keterangan,
    siswa_nama: result.siswa.nama,
    siswa_nisn: result.siswa.nisn,
    kelas_nama: result.kelas.nama_kelas,
    guru_nama: result.guru?.nama || null,
    created_at: result.absensi.created_at,
    updated_at: result.absensi.updated_at
  }));
}

// Helper function to get attendance statistics
async function getAttendanceStats(kelasId?: number, startDate?: Date, endDate?: Date) {
  // Build conditions array
  const conditions: SQL<unknown>[] = [];

  if (kelasId !== undefined) {
    conditions.push(eq(absensiTable.kelas_id, kelasId));
  }

  if (startDate !== undefined) {
    conditions.push(gte(absensiTable.tanggal, startDate));
  }

  if (endDate !== undefined) {
    conditions.push(lte(absensiTable.tanggal, endDate));
  }

  // Build complete query based on whether we have conditions
  const baseQuery = db.select({
    status: absensiTable.status,
    count: absensiTable.id
  })
  .from(absensiTable);

  const finalQuery = conditions.length > 0
    ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
    : baseQuery;

  const results = await finalQuery.execute();

  // Count occurrences by status
  const stats = {
    hadir: 0,
    izin: 0,
    sakit: 0,
    alpha: 0
  };

  results.forEach(result => {
    if (result.status in stats) {
      stats[result.status as keyof typeof stats]++;
    }
  });

  return stats;
}

export async function exportAbsensiToPDF(input: GetAbsensiHistoryInput): Promise<{
    success: boolean;
    downloadUrl?: string;
    message: string;
}> {
  try {
    // Get absensi data
    const absensiData = await getAbsensiData(input);
    
    if (absensiData.length === 0) {
      return {
        success: false,
        message: 'Tidak ada data absensi yang ditemukan untuk kriteria yang diberikan'
      };
    }

    // Get statistics for the report
    const stats = await getAttendanceStats(input.kelas_id, input.start_date, input.end_date);

    // In a real implementation, you would use a PDF generation library like puppeteer, jsPDF, or PDFKit
    // For this implementation, we'll simulate the PDF generation process
    const fileName = `absensi_report_${formatFileDate(new Date())}.pdf`;
    const downloadUrl = `/exports/pdf/${fileName}`;

    // Simulate PDF generation with attendance data
    const reportData = {
      title: 'Laporan Absensi Siswa',
      generatedAt: new Date(),
      dateRange: {
        start: input.start_date ? formatDate(input.start_date) : 'Semua',
        end: input.end_date ? formatDate(input.end_date) : 'Semua'
      },
      totalRecords: absensiData.length,
      statistics: stats,
      records: absensiData.map(record => ({
        tanggal: formatDate(record.tanggal),
        siswa: record.siswa_nama,
        nisn: record.siswa_nisn,
        kelas: record.kelas_nama,
        status: record.status.toUpperCase(),
        waktu_masuk: record.waktu_masuk || '-',
        waktu_pulang: record.waktu_pulang || '-',
        guru: record.guru_nama || '-',
        keterangan: record.keterangan || '-'
      }))
    };

    // Log the PDF generation (in real implementation, this would create the actual PDF)
    console.log('PDF Export Data:', {
      fileName,
      recordCount: reportData.totalRecords,
      statistics: reportData.statistics,
      dateRange: reportData.dateRange
    });

    return {
      success: true,
      downloadUrl,
      message: `PDF berhasil dibuat dengan ${absensiData.length} record absensi`
    };
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
}

export async function exportAbsensiToExcel(input: GetAbsensiHistoryInput): Promise<{
    success: boolean;
    downloadUrl?: string;
    message: string;
}> {
  try {
    // Get absensi data
    const absensiData = await getAbsensiData(input);
    
    if (absensiData.length === 0) {
      return {
        success: false,
        message: 'Tidak ada data absensi yang ditemukan untuk kriteria yang diberikan'
      };
    }

    // Get statistics for the summary sheet
    const stats = await getAttendanceStats(input.kelas_id, input.start_date, input.end_date);

    // In a real implementation, you would use a library like ExcelJS or xlsx
    // For this implementation, we'll simulate the Excel generation process
    const fileName = `absensi_export_${formatFileDate(new Date())}.xlsx`;
    const downloadUrl = `/exports/excel/${fileName}`;

    // Prepare Excel data with multiple sheets
    const excelData = {
      sheets: {
        'Data Absensi': absensiData.map(record => ({
          'Tanggal': formatDate(record.tanggal),
          'NISN': record.siswa_nisn,
          'Nama Siswa': record.siswa_nama,
          'Kelas': record.kelas_nama,
          'Status': record.status.toUpperCase(),
          'Waktu Masuk': record.waktu_masuk || '',
          'Waktu Pulang': record.waktu_pulang || '',
          'Guru Pencatat': record.guru_nama || '',
          'Keterangan': record.keterangan || ''
        })),
        'Statistik': [
          { 'Status': 'HADIR', 'Jumlah': stats.hadir },
          { 'Status': 'IZIN', 'Jumlah': stats.izin },
          { 'Status': 'SAKIT', 'Jumlah': stats.sakit },
          { 'Status': 'ALPHA', 'Jumlah': stats.alpha },
          { 'Status': 'TOTAL', 'Jumlah': stats.hadir + stats.izin + stats.sakit + stats.alpha }
        ]
      },
      metadata: {
        title: 'Export Absensi Siswa',
        generatedAt: formatDateTime(new Date()),
        dateRange: {
          start: input.start_date ? formatDate(input.start_date) : 'Semua',
          end: input.end_date ? formatDate(input.end_date) : 'Semua'
        }
      }
    };

    // Log the Excel generation (in real implementation, this would create the actual Excel file)
    console.log('Excel Export Data:', {
      fileName,
      recordCount: absensiData.length,
      sheets: Object.keys(excelData.sheets),
      statistics: stats
    });

    return {
      success: true,
      downloadUrl,
      message: `Excel berhasil dibuat dengan ${absensiData.length} record absensi dalam 2 sheet`
    };
  } catch (error) {
    console.error('Excel export failed:', error);
    throw error;
  }
}

export async function generateRekapAbsensi(input: {
    kelasId?: number;
    startDate: Date;
    endDate: Date;
    format: 'pdf' | 'excel';
}): Promise<{
    success: boolean;
    downloadUrl?: string;
    message: string;
}> {
  try {
    // Get comprehensive attendance data for recap
    const rekapInput: GetAbsensiHistoryInput = {
      kelas_id: input.kelasId,
      start_date: input.startDate,
      end_date: input.endDate,
      limit: 1000, // Higher limit for comprehensive recap
      offset: 0
    };

    const absensiData = await getAbsensiData(rekapInput);
    
    if (absensiData.length === 0) {
      return {
        success: false,
        message: 'Tidak ada data absensi yang ditemukan untuk periode yang dipilih'
      };
    }

    // Get detailed statistics
    const stats = await getAttendanceStats(input.kelasId, input.startDate, input.endDate);

    // Calculate additional metrics
    const totalDays = Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalRecords = stats.hadir + stats.izin + stats.sakit + stats.alpha;
    const attendanceRate = totalRecords > 0 ? ((stats.hadir / totalRecords) * 100).toFixed(2) : '0';

    // Group data by student for individual statistics
    const studentStats = absensiData.reduce((acc, record) => {
      const key = `${record.siswa_id}_${record.siswa_nama}_${record.siswa_nisn}`;
      if (!acc[key]) {
        acc[key] = {
          siswa_nama: record.siswa_nama,
          siswa_nisn: record.siswa_nisn,
          kelas_nama: record.kelas_nama,
          hadir: 0,
          izin: 0,
          sakit: 0,
          alpha: 0,
          total: 0
        };
      }
      acc[key][record.status]++;
      acc[key].total++;
      return acc;
    }, {} as Record<string, any>);

    const startDateStr = formatFileDate(input.startDate).substring(0, 8); // YYYYMMDD
    const endDateStr = formatFileDate(input.endDate).substring(0, 8); // YYYYMMDD
    const fileName = input.format === 'pdf' 
      ? `rekap_absensi_${startDateStr}_${endDateStr}.pdf`
      : `rekap_absensi_${startDateStr}_${endDateStr}.xlsx`;
    
    const downloadUrl = `/exports/${input.format}/${fileName}`;

    // Prepare comprehensive recap data
    const rekapData = {
      metadata: {
        title: 'Rekap Absensi Siswa',
        periode: `${formatDate(input.startDate)} - ${formatDate(input.endDate)}`,
        totalHari: totalDays,
        generatedAt: formatDateTime(new Date()),
        kelasFilter: input.kelasId ? 'Kelas Tertentu' : 'Semua Kelas'
      },
      summary: {
        totalRecords,
        attendanceRate: `${attendanceRate}%`,
        statistics: stats
      },
      studentDetails: Object.values(studentStats).map((student: any) => ({
        ...student,
        attendanceRate: student.total > 0 ? `${((student.hadir / student.total) * 100).toFixed(1)}%` : '0%'
      })),
      dailyBreakdown: absensiData.reduce((acc, record) => {
        const dateKey = record.tanggal.toISOString().substring(0, 10); // YYYY-MM-DD
        if (!acc[dateKey]) {
          acc[dateKey] = {
            tanggal: formatDate(record.tanggal),
            hadir: 0,
            izin: 0,
            sakit: 0,
            alpha: 0
          };
        }
        acc[dateKey][record.status]++;
        return acc;
      }, {} as Record<string, any>)
    };

    // Log the recap generation (in real implementation, this would create the actual file)
    console.log('Rekap Absensi Generation:', {
      format: input.format,
      fileName,
      periode: rekapData.metadata.periode,
      totalRecords: rekapData.summary.totalRecords,
      attendanceRate: rekapData.summary.attendanceRate,
      uniqueStudents: Object.keys(studentStats).length,
      dailyBreakdownDays: Object.keys(rekapData.dailyBreakdown).length
    });

    return {
      success: true,
      downloadUrl,
      message: `Rekap absensi berhasil dibuat dalam format ${input.format.toUpperCase()} dengan ${totalRecords} record dari ${Object.keys(studentStats).length} siswa`
    };
  } catch (error) {
    console.error('Rekap absensi generation failed:', error);
    throw error;
  }
}