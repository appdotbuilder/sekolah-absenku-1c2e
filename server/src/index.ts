import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  loginInputSchema,
  createUserInputSchema,
  updateUserInputSchema,
  createSiswaInputSchema,
  updateSiswaInputSchema,
  createGuruInputSchema,
  updateGuruInputSchema,
  createKelasInputSchema,
  updateKelasInputSchema,
  createAbsensiInputSchema,
  updateAbsensiInputSchema,
  absenMasukInputSchema,
  absenPulangInputSchema,
  getAbsensiHistoryInputSchema,
  createPengajuanIzinInputSchema,
  reviewPengajuanIzinInputSchema
} from './schema';

// Import handlers
import { login, getCurrentUser } from './handlers/auth';
import { createUser, updateUser, deleteUser, getAllUsers } from './handlers/user';
import { createSiswa, updateSiswa, deleteSiswa, getAllSiswa, getSiswaByKelas, getSiswaById } from './handlers/siswa';
import { createGuru, updateGuru, deleteGuru, getAllGuru, getGuruById } from './handlers/guru';
import { createKelas, updateKelas, deleteKelas, getAllKelas, getKelasByWaliKelas, getKelasById } from './handlers/kelas';
import { 
  createAbsensi, 
  updateAbsensi, 
  absenMasuk, 
  absenPulang, 
  getAbsensiHistory, 
  getTodayAbsensi, 
  getAbsensiStats, 
  deleteAbsensi 
} from './handlers/absensi';
import { 
  createPengajuanIzin, 
  reviewPengajuanIzin, 
  getPengajuanIzinBySiswa, 
  getPendingPengajuanIzin, 
  getAllPengajuanIzin, 
  deletePengajuanIzin 
} from './handlers/pengajuan_izin';
import { getDashboardStats, getGuruDashboardStats, getSiswaDashboardStats } from './handlers/dashboard';
import { exportAbsensiToPDF, exportAbsensiToExcel, generateRekapAbsensi } from './handlers/export';

// Import Zod for validation
import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),
  
  getCurrentUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getCurrentUser(input.userId)),

  // User management routes (Admin only)
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),
  
  deleteUser: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteUser(input.id)),
  
  getAllUsers: publicProcedure
    .query(() => getAllUsers()),

  // Siswa management routes
  createSiswa: publicProcedure
    .input(createSiswaInputSchema)
    .mutation(({ input }) => createSiswa(input)),
  
  updateSiswa: publicProcedure
    .input(updateSiswaInputSchema)
    .mutation(({ input }) => updateSiswa(input)),
  
  deleteSiswa: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteSiswa(input.id)),
  
  getAllSiswa: publicProcedure
    .query(() => getAllSiswa()),
  
  getSiswaByKelas: publicProcedure
    .input(z.object({ kelasId: z.number() }))
    .query(({ input }) => getSiswaByKelas(input.kelasId)),
  
  getSiswaById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getSiswaById(input.id)),

  // Guru management routes
  createGuru: publicProcedure
    .input(createGuruInputSchema)
    .mutation(({ input }) => createGuru(input)),
  
  updateGuru: publicProcedure
    .input(updateGuruInputSchema)
    .mutation(({ input }) => updateGuru(input)),
  
  deleteGuru: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteGuru(input.id)),
  
  getAllGuru: publicProcedure
    .query(() => getAllGuru()),
  
  getGuruById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getGuruById(input.id)),

  // Kelas management routes
  createKelas: publicProcedure
    .input(createKelasInputSchema)
    .mutation(({ input }) => createKelas(input)),
  
  updateKelas: publicProcedure
    .input(updateKelasInputSchema)
    .mutation(({ input }) => updateKelas(input)),
  
  deleteKelas: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteKelas(input.id)),
  
  getAllKelas: publicProcedure
    .query(() => getAllKelas()),
  
  getKelasByWaliKelas: publicProcedure
    .input(z.object({ guruId: z.number() }))
    .query(({ input }) => getKelasByWaliKelas(input.guruId)),
  
  getKelasById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getKelasById(input.id)),

  // Absensi routes
  createAbsensi: publicProcedure
    .input(createAbsensiInputSchema)
    .mutation(({ input }) => createAbsensi(input)),
  
  updateAbsensi: publicProcedure
    .input(updateAbsensiInputSchema)
    .mutation(({ input }) => updateAbsensi(input)),
  
  deleteAbsensi: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteAbsensi(input.id)),
  
  absenMasuk: publicProcedure
    .input(absenMasukInputSchema)
    .mutation(({ input }) => absenMasuk(input)),
  
  absenPulang: publicProcedure
    .input(absenPulangInputSchema)
    .mutation(({ input }) => absenPulang(input)),
  
  getAbsensiHistory: publicProcedure
    .input(getAbsensiHistoryInputSchema)
    .query(({ input }) => getAbsensiHistory(input)),
  
  getTodayAbsensi: publicProcedure
    .input(z.object({ 
      siswaId: z.number().optional(), 
      kelasId: z.number().optional() 
    }))
    .query(({ input }) => getTodayAbsensi(input.siswaId, input.kelasId)),
  
  getAbsensiStats: publicProcedure
    .input(z.object({
      kelasId: z.number().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional()
    }))
    .query(({ input }) => getAbsensiStats(input.kelasId, input.startDate, input.endDate)),

  // Pengajuan Izin routes
  createPengajuanIzin: publicProcedure
    .input(createPengajuanIzinInputSchema)
    .mutation(({ input }) => createPengajuanIzin(input)),
  
  reviewPengajuanIzin: publicProcedure
    .input(reviewPengajuanIzinInputSchema)
    .mutation(({ input }) => reviewPengajuanIzin(input)),
  
  getPengajuanIzinBySiswa: publicProcedure
    .input(z.object({ siswaId: z.number() }))
    .query(({ input }) => getPengajuanIzinBySiswa(input.siswaId)),
  
  getPendingPengajuanIzin: publicProcedure
    .input(z.object({ kelasId: z.number().optional() }))
    .query(({ input }) => getPendingPengajuanIzin(input.kelasId)),
  
  getAllPengajuanIzin: publicProcedure
    .query(() => getAllPengajuanIzin()),
  
  deletePengajuanIzin: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deletePengajuanIzin(input.id)),

  // Dashboard routes
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),
  
  getGuruDashboardStats: publicProcedure
    .input(z.object({ guruId: z.number() }))
    .query(({ input }) => getGuruDashboardStats(input.guruId)),
  
  getSiswaDashboardStats: publicProcedure
    .input(z.object({ siswaId: z.number() }))
    .query(({ input }) => getSiswaDashboardStats(input.siswaId)),

  // Export routes
  exportAbsensiToPDF: publicProcedure
    .input(getAbsensiHistoryInputSchema)
    .mutation(({ input }) => exportAbsensiToPDF(input)),
  
  exportAbsensiToExcel: publicProcedure
    .input(getAbsensiHistoryInputSchema)
    .mutation(({ input }) => exportAbsensiToExcel(input)),
  
  generateRekapAbsensi: publicProcedure
    .input(z.object({
      kelasId: z.number().optional(),
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      format: z.enum(['pdf', 'excel'])
    }))
    .mutation(({ input }) => generateRekapAbsensi(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();