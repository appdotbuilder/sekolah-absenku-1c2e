import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('role', ['admin', 'guru', 'siswa']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['hadir', 'izin', 'sakit', 'alpha']);
export const requestStatusEnum = pgEnum('request_status', ['pending', 'approved', 'rejected']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username'), // Nullable for admin
  nip: text('nip'), // Nullable for guru
  nisn: text('nisn'), // Nullable for siswa
  password_hash: text('password_hash').notNull(),
  role: roleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Kelas table (defined before siswa and guru for foreign key references)
export const kelasTable = pgTable('kelas', {
  id: serial('id').primaryKey(),
  nama_kelas: text('nama_kelas').notNull(),
  wali_kelas_id: integer('wali_kelas_id').notNull(), // Will reference guru table
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Siswa table
export const siswaTable = pgTable('siswa', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  nisn: text('nisn').notNull().unique(),
  nama: text('nama').notNull(),
  kelas_id: integer('kelas_id').notNull().references(() => kelasTable.id, { onDelete: 'restrict' }),
  foto: text('foto'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Guru table
export const guruTable = pgTable('guru', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  nip: text('nip').notNull().unique(),
  nama: text('nama').notNull(),
  foto: text('foto'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Absensi table
export const absensiTable = pgTable('absensi', {
  id: serial('id').primaryKey(),
  siswa_id: integer('siswa_id').notNull().references(() => siswaTable.id, { onDelete: 'cascade' }),
  guru_id: integer('guru_id').references(() => guruTable.id, { onDelete: 'set null' }), // Nullable
  kelas_id: integer('kelas_id').notNull().references(() => kelasTable.id, { onDelete: 'restrict' }),
  status: attendanceStatusEnum('status').notNull(),
  tanggal: timestamp('tanggal').notNull(),
  waktu_masuk: text('waktu_masuk'), // Time format HH:MM:SS, nullable
  waktu_pulang: text('waktu_pulang'), // Time format HH:MM:SS, nullable
  keterangan: text('keterangan'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Pengajuan Izin table
export const pengajuanIzinTable = pgTable('pengajuan_izin', {
  id: serial('id').primaryKey(),
  siswa_id: integer('siswa_id').notNull().references(() => siswaTable.id, { onDelete: 'cascade' }),
  tanggal: timestamp('tanggal').notNull(),
  alasan: text('alasan').notNull(),
  status: requestStatusEnum('status').notNull().default('pending'),
  jenis: pgEnum('jenis_izin', ['izin', 'sakit'])('jenis').notNull(),
  reviewer_id: integer('reviewer_id').references(() => usersTable.id, { onDelete: 'set null' }), // Nullable
  reviewed_at: timestamp('reviewed_at'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ one }) => ({
  siswa: one(siswaTable, {
    fields: [usersTable.id],
    references: [siswaTable.user_id],
  }),
  guru: one(guruTable, {
    fields: [usersTable.id],
    references: [guruTable.user_id],
  }),
}));

export const siswaRelations = relations(siswaTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [siswaTable.user_id],
    references: [usersTable.id],
  }),
  kelas: one(kelasTable, {
    fields: [siswaTable.kelas_id],
    references: [kelasTable.id],
  }),
  absensi: many(absensiTable),
  pengajuanIzin: many(pengajuanIzinTable),
}));

export const guruRelations = relations(guruTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [guruTable.user_id],
    references: [usersTable.id],
  }),
  kelasWaliKelas: many(kelasTable),
  absensiVerified: many(absensiTable),
}));

export const kelasRelations = relations(kelasTable, ({ one, many }) => ({
  waliKelas: one(guruTable, {
    fields: [kelasTable.wali_kelas_id],
    references: [guruTable.id],
  }),
  siswa: many(siswaTable),
  absensi: many(absensiTable),
}));

export const absensiRelations = relations(absensiTable, ({ one }) => ({
  siswa: one(siswaTable, {
    fields: [absensiTable.siswa_id],
    references: [siswaTable.id],
  }),
  guru: one(guruTable, {
    fields: [absensiTable.guru_id],
    references: [guruTable.id],
  }),
  kelas: one(kelasTable, {
    fields: [absensiTable.kelas_id],
    references: [kelasTable.id],
  }),
}));

export const pengajuanIzinRelations = relations(pengajuanIzinTable, ({ one }) => ({
  siswa: one(siswaTable, {
    fields: [pengajuanIzinTable.siswa_id],
    references: [siswaTable.id],
  }),
  reviewer: one(usersTable, {
    fields: [pengajuanIzinTable.reviewer_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Siswa = typeof siswaTable.$inferSelect;
export type NewSiswa = typeof siswaTable.$inferInsert;

export type Guru = typeof guruTable.$inferSelect;
export type NewGuru = typeof guruTable.$inferInsert;

export type Kelas = typeof kelasTable.$inferSelect;
export type NewKelas = typeof kelasTable.$inferInsert;

export type Absensi = typeof absensiTable.$inferSelect;
export type NewAbsensi = typeof absensiTable.$inferInsert;

export type PengajuanIzin = typeof pengajuanIzinTable.$inferSelect;
export type NewPengajuanIzin = typeof pengajuanIzinTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  siswa: siswaTable,
  guru: guruTable,
  kelas: kelasTable,
  absensi: absensiTable,
  pengajuanIzin: pengajuanIzinTable
};