import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

export * from "./auth-schema";

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date());

export type Diagnosis = { code: string; name: string; kind: "presuntivo" | "definitivo" };
export type RxItem = {
  genericName: string;
  concentration: string;
  form: string;
  quantity: number;
  quantityWords: string;
  route: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
};

/** Perfil profesional del médico (1:1 con user). */
export const doctorProfiles = sqliteTable("doctor_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique(),
  title: text("title").notNull().default("Dr."),
  fullName: text("full_name").notNull(),
  specialty: text("specialty").notNull().default("Medicina General"),
  cedula: text("cedula").notNull().default(""),
  senescytReg: text("senescyt_reg").notNull().default(""),
  acessReg: text("acess_reg").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default("Quito"),
  bio: text("bio").notNull().default(""),
  signatureUrl: text("signature_url"),
  stampUrl: text("stamp_url"),
  consultationFee: real("consultation_fee").notNull().default(40),
  slotMinutes: integer("slot_minutes").notNull().default(30),
  bookingEnabled: integer("booking_enabled", { mode: "boolean" }).notNull().default(true),
  color: text("color").notNull().default("#1F3263"),
  createdAt: createdAt(),
});

/** Bloques de atención semanales. weekday: 0=domingo … 6=sábado */
export const schedules = sqliteTable("schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  doctorId: text("doctor_id").notNull(),
  weekday: integer("weekday").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
});

export const patients = sqliteTable(
  "patients",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    doctorId: text("doctor_id").notNull(),
    idType: text("id_type").notNull().default("cedula"),
    idNumber: text("id_number").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    birthDate: text("birth_date"),
    sex: text("sex").notNull().default("F"),
    bloodType: text("blood_type").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    address: text("address").notNull().default(""),
    city: text("city").notNull().default(""),
    occupation: text("occupation").notNull().default(""),
    maritalStatus: text("marital_status").notNull().default(""),
    insurance: text("insurance").notNull().default(""),
    emergencyContact: text("emergency_contact").notNull().default(""),
    emergencyPhone: text("emergency_phone").notNull().default(""),
    allergies: text("allergies").notNull().default(""),
    personalHistory: text("personal_history").notNull().default(""),
    surgicalHistory: text("surgical_history").notNull().default(""),
    familyHistory: text("family_history").notNull().default(""),
    habits: text("habits").notNull().default(""),
    gynecoHistory: text("gyneco_history").notNull().default(""),
    currentMedications: text("current_medications").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("patients_doctor_idx").on(t.doctorId)],
);

export const appointments = sqliteTable(
  "appointments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    doctorId: text("doctor_id").notNull(),
    patientId: integer("patient_id").notNull(),
    startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
    status: text("status").notNull().default("agendada"),
    reason: text("reason").notNull().default(""),
    notes: text("notes").notNull().default(""),
    source: text("source").notNull().default("manual"),
    price: real("price").notNull().default(0),
    publicToken: text("public_token").notNull(),
    reminderSentAt: integer("reminder_sent_at", { mode: "timestamp" }),
    createdAt: createdAt(),
  },
  (t) => [index("appt_doctor_idx").on(t.doctorId, t.startsAt)],
);

export const consultations = sqliteTable("consultations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  doctorId: text("doctor_id").notNull(),
  patientId: integer("patient_id").notNull(),
  appointmentId: integer("appointment_id"),
  date: integer("date", { mode: "timestamp" }).notNull(),
  reason: text("reason").notNull().default(""),
  currentIllness: text("current_illness").notNull().default(""),
  systemsReview: text("systems_review").notNull().default(""),
  bpSys: integer("bp_sys"),
  bpDia: integer("bp_dia"),
  heartRate: integer("heart_rate"),
  respRate: integer("resp_rate"),
  temperature: real("temperature"),
  spo2: integer("spo2"),
  weight: real("weight"),
  height: real("height"),
  glucose: integer("glucose"),
  physicalExam: text("physical_exam").notNull().default(""),
  diagnoses: text("diagnoses", { mode: "json" }).$type<Diagnosis[]>().notNull().default([]),
  plan: text("plan").notNull().default(""),
  exams: text("exams").notNull().default(""),
  nextVisit: text("next_visit"),
  createdAt: createdAt(),
});

export const prescriptions = sqliteTable("prescriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  doctorId: text("doctor_id").notNull(),
  patientId: integer("patient_id").notNull(),
  consultationId: integer("consultation_id"),
  code: text("code").notNull().unique(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  diagnoses: text("diagnoses", { mode: "json" }).$type<Diagnosis[]>().notNull().default([]),
  items: text("items", { mode: "json" }).$type<RxItem[]>().notNull().default([]),
  recommendations: text("recommendations").notNull().default(""),
  warningSigns: text("warning_signs").notNull().default(""),
  nextVisit: text("next_visit"),
  createdAt: createdAt(),
});

export const certificates = sqliteTable("certificates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  doctorId: text("doctor_id").notNull(),
  patientId: integer("patient_id").notNull(),
  consultationId: integer("consultation_id"),
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // reposo | asistencia | salud
  date: integer("date", { mode: "timestamp" }).notNull(),
  diagnoses: text("diagnoses", { mode: "json" }).$type<Diagnosis[]>().notNull().default([]),
  restDays: integer("rest_days"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  timeFrom: text("time_from"),
  timeTo: text("time_to"),
  institution: text("institution").notNull().default(""),
  observations: text("observations").notNull().default(""),
  createdAt: createdAt(),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  doctorId: text("doctor_id").notNull(),
  patientId: integer("patient_id").notNull(),
  appointmentId: integer("appointment_id"),
  date: integer("date", { mode: "timestamp" }).notNull(),
  amount: real("amount").notNull(),
  method: text("method").notNull().default("efectivo"),
  status: text("status").notNull().default("pagado"),
  concept: text("concept").notNull().default("Consulta médica"),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
});
