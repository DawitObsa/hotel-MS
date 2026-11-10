import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { z } from 'zod';
import Patient from './models/Patient.js';
import Appointment from './models/Appointment.js';
import Vital from './models/Vital.js';
import User from './models/User.js';
import BootstrapLock from './models/BootstrapLock.js';
import { authenticate, allowRoles } from './middleware/auth.js';
import { validate } from './middleware/validate.js';
import { escapeRegex, positivePage } from './lib/query.js';
import { isBloodPressureValid } from './lib/vitals.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
const frontendOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: frontendOrigins }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }));

const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(128) });
const passwordChangeSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(12).max(128) });
const bootstrapSchema = z.object({ setupKey: z.string().min(1).max(200), name: z.string().trim().min(2).max(100), email: z.email().max(254), password: z.string().min(12).max(128) });
const staffSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.email().max(254), password: z.string().min(12).max(128), role: z.enum(['admin', 'doctor', 'nurse', 'receptionist']) });
const patientSchema = z.object({ patientNumber: z.string().trim().min(2).max(30), firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), dateOfBirth: z.iso.date(), sex: z.enum(['female', 'male', 'other', 'undisclosed']), phone: z.string().trim().max(30).optional().default(''), email: z.union([z.literal(''), z.email()]).optional().default(''), address: z.string().trim().max(300).optional().default(''), bloodType: z.enum(['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().default(''), allergies: z.string().trim().max(1000).optional().default('') });
const appointmentSchema = z.object({ patient: z.string().refine(mongoose.isValidObjectId, 'Choose a valid patient.'), clinician: z.string().trim().min(2).max(100), department: z.string().trim().min(2).max(80), startsAt: z.iso.datetime(), reason: z.string().trim().max(500).optional().default('') });
const vitalSchema = z.object({ recordedAt: z.iso.datetime().optional(), systolic: z.number().int().min(40).max(300), diastolic: z.number().int().min(20).max(200), pulse: z.number().int().min(20).max(250), temperatureC: z.number().min(25).max(45), respiratoryRate: z.number().int().min(1).max(80), oxygenSaturation: z.number().int().min(50).max(100), weightKg: z.number().min(0.2).max(500).optional(), heightCm: z.number().min(20).max(260).optional(), painScore: z.number().int().min(0).max(10).optional(), notes: z.string().trim().max(500).optional().default('') }).refine((value) => isBloodPressureValid(value.systolic, value.diastolic), { path: ['diastolic'], message: 'Diastolic pressure must be lower than systolic pressure.' });

app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));

app.post('/api/auth/bootstrap', validate(bootstrapSchema), async (req, res, next) => {
  let claimed = false;
  try {
    const { setupKey, name, email, password } = req.validatedBody;
    if (!process.env.ADMIN_SETUP_KEY || setupKey !== process.env.ADMIN_SETUP_KEY) return res.status(403).json({ error: 'Setup key is not valid.' });
    try {
      await BootstrapLock.create({ _id: 'initial-admin' });
      claimed = true;
    } catch (error) {
      if (error?.code === 11000) return res.status(409).json({ error: 'Initial administrator is already configured.' });
      throw error;
    }
    if (await User.exists({})) {
      await BootstrapLock.deleteOne({ _id: 'initial-admin' });
      return res.status(409).json({ error: 'Initial administrator is already configured.' });
    }
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role: 'admin' });
    return res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    if (claimed) await BootstrapLock.deleteOne({ _id: 'initial-admin' }).catch(() => {});
    next(error);
  }
});

app.post('/api/auth/login', validate(loginSchema), async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.validatedBody.email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(req.validatedBody.password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    const token = jwt.sign({ sub: user.id, sessionVersion: user.sessionVersion }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h', issuer: 'hospital-ms' });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { next(error); }
});
app.post('/api/auth/password', authenticate, validate(passwordChangeSchema), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user || !(await bcrypt.compare(req.validatedBody.currentPassword, user.passwordHash))) return res.status(401).json({ error: 'Current password is incorrect.' });
    if (await bcrypt.compare(req.validatedBody.newPassword, user.passwordHash)) return res.status(400).json({ error: 'Choose a password you have not used before.' });
    user.passwordHash = await bcrypt.hash(req.validatedBody.newPassword, 12);
    user.passwordChangedAt = new Date();
    user.sessionVersion += 1;
    await user.save();
    return res.json({ message: 'Password updated. Please sign in again.' });
  } catch (error) { next(error); }
});

app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role } }));
app.get('/api/users', authenticate, allowRoles('admin'), async (_req, res, next) => {
  try {
    const items = await User.find().select('name email role createdAt').sort({ name: 1 }).limit(200).lean();
    res.json({ items });
  } catch (error) { next(error); }
});
app.post('/api/users', authenticate, allowRoles('admin'), validate(staffSchema), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.validatedBody;
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) { next(error); }
});
app.get('/api/dashboard', authenticate, async (_req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const [patients, appointments, todayAppointments, upcoming] = await Promise.all([
      Patient.countDocuments(), Appointment.countDocuments({ status: { $ne: 'cancelled' } }),
      Appointment.countDocuments({ startsAt: { $gte: today, $lt: tomorrow }, status: { $ne: 'cancelled' } }),
      Appointment.find({ startsAt: { $gte: new Date() }, status: { $in: ['scheduled', 'checked-in'] } }).sort({ startsAt: 1 }).limit(8).populate('patient', 'firstName lastName patientNumber').lean(),
    ]);
    res.json({ stats: { patients, appointments, todayAppointments }, upcoming });
  } catch (error) { next(error); }
});

app.get('/api/patients', authenticate, async (req, res, next) => {
  try {
    const page = positivePage(req.query.page);
    const limit = positivePage(req.query.limit, 50, 100);
    const query = String(req.query.q || '').trim().slice(0, 100);
    const filter = query ? { $or: ['firstName', 'lastName', 'patientNumber', 'phone'].map((key) => ({ [key]: { $regex: escapeRegex(query), $options: 'i' } })) } : {};
    const patientQuery = Patient.find(filter).sort({ lastName: 1, firstName: 1 }).skip((page - 1) * limit).limit(limit);
    if (req.user.role === 'receptionist') patientQuery.select('-allergies -bloodType');
    const [items, total] = await Promise.all([patientQuery.lean(), Patient.countDocuments(filter)]);
    res.json({ items, page, limit, total });
  } catch (error) { next(error); }
});
app.post('/api/patients', authenticate, allowRoles('admin', 'doctor', 'nurse', 'receptionist'), validate(patientSchema), async (req, res, next) => {
  try {
    const payload = { ...req.validatedBody };
    if (req.user.role === 'receptionist') { payload.bloodType = ''; payload.allergies = ''; }
    const patient = await Patient.create(payload);
    if (req.user.role === 'receptionist') patient.set('bloodType', undefined).set('allergies', undefined);
    return res.status(201).json(patient);
  } catch (error) { next(error); }
});
app.patch('/api/patients/:id', authenticate, allowRoles('admin', 'doctor', 'nurse'), validate(patientSchema.partial()), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid patient ID.' });
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.validatedBody, { new: true, runValidators: true });
    return patient ? res.json(patient) : res.status(404).json({ error: 'Patient not found.' });
  } catch (error) { next(error); }
});

app.get('/api/appointments', authenticate, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.from || req.query.to) filter.startsAt = { ...(req.query.from ? { $gte: new Date(req.query.from) } : {}), ...(req.query.to ? { $lte: new Date(req.query.to) } : {}) };
    if (req.query.status && ['scheduled', 'checked-in', 'completed', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;
    const items = await Appointment.find(filter).sort({ startsAt: 1 }).limit(200).populate('patient', 'firstName lastName patientNumber').lean();
    res.json({ items });
  } catch (error) { next(error); }
});
app.post('/api/appointments', authenticate, allowRoles('admin', 'doctor', 'nurse', 'receptionist'), validate(appointmentSchema), async (req, res, next) => {
  try {
    if (!(await Patient.exists({ _id: req.validatedBody.patient }))) return res.status(404).json({ error: 'Patient not found.' });
    const item = await Appointment.create({ ...req.validatedBody, createdBy: req.user.id });
    res.status(201).json(await item.populate('patient', 'firstName lastName patientNumber'));
  } catch (error) { next(error); }
});
app.patch('/api/appointments/:id/status', authenticate, allowRoles('admin', 'doctor', 'nurse'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid appointment ID.' });
    const status = z.enum(['scheduled', 'checked-in', 'completed', 'cancelled']).safeParse(req.body.status);
    if (!status.success) return res.status(400).json({ error: 'Choose a valid appointment status.' });
    const item = await Appointment.findByIdAndUpdate(req.params.id, { status: status.data }, { new: true, runValidators: true }).populate('patient', 'firstName lastName patientNumber');
    return item ? res.json(item) : res.status(404).json({ error: 'Appointment not found.' });
  } catch (error) { next(error); }
});

app.get('/api/patients/:id/vitals', authenticate, allowRoles('admin', 'doctor', 'nurse'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid patient ID.' });
    if (!(await Patient.exists({ _id: req.params.id }))) return res.status(404).json({ error: 'Patient not found.' });
    const items = await Vital.find({ patient: req.params.id }).sort({ recordedAt: -1 }).limit(100).populate('recordedBy', 'name role').lean();
    return res.json({ items });
  } catch (error) { next(error); }
});
app.post('/api/patients/:id/vitals', authenticate, allowRoles('admin', 'doctor', 'nurse'), validate(vitalSchema), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid patient ID.' });
    if (!(await Patient.exists({ _id: req.params.id }))) return res.status(404).json({ error: 'Patient not found.' });
    const item = await Vital.create({ ...req.validatedBody, patient: req.params.id, recordedBy: req.user.id });
    return res.status(201).json(await item.populate('recordedBy', 'name role'));
  } catch (error) { next(error); }
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((error, _req, res, _next) => {
  if (error?.code === 11000) return res.status(409).json({ error: 'A record with that unique value already exists.' });
  if (error?.name === 'ValidationError' || error?.name === 'CastError') return res.status(400).json({ error: 'Submitted data is invalid.' });
  if (process.env.NODE_ENV !== 'production') console.error(error);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

export default app;
