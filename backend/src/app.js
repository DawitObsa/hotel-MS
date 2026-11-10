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
import AuditLog from './models/AuditLog.js';
import Prescription from './models/Prescription.js';
import LabResult from './models/LabResult.js';
import Invoice from './models/Invoice.js';
import Admission from './models/Admission.js';
import LabOrder from './models/LabOrder.js';
import InventoryItem from './models/InventoryItem.js';
import NursingNote from './models/NursingNote.js';
import { authenticate, allowRoles } from './middleware/auth.js';
import { validate } from './middleware/validate.js';
import { escapeRegex, positivePage } from './lib/query.js';
import { isBloodPressureValid } from './lib/vitals.js';
import { audit } from './lib/audit.js';

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
const patientSchema = z.object({ patientNumber: z.string().trim().min(2).max(30), firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), dateOfBirth: z.iso.date(), sex: z.enum(['female', 'male', 'other', 'undisclosed']), phone: z.string().trim().max(30).optional().default(''), email: z.union([z.literal(''), z.email()]).optional().default(''), address: z.string().trim().max(300).optional().default(''), bloodType: z.enum(['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().default(''), allergies: z.string().trim().max(1000).optional().default(''), emergencyContactName: z.string().trim().max(100).optional().default(''), emergencyContactPhone: z.string().trim().max(30).optional().default(''), medicalHistory: z.string().trim().max(4000).optional().default('') });
const appointmentSchema = z.object({ patient: z.string().refine(mongoose.isValidObjectId, 'Choose a valid patient.'), clinician: z.string().trim().min(2).max(100), department: z.string().trim().min(2).max(80), startsAt: z.iso.datetime(), reason: z.string().trim().max(500).optional().default('') });
const vitalSchema = z.object({ recordedAt: z.iso.datetime().optional(), systolic: z.number().int().min(40).max(300), diastolic: z.number().int().min(20).max(200), pulse: z.number().int().min(20).max(250), temperatureC: z.number().min(25).max(45), respiratoryRate: z.number().int().min(1).max(80), oxygenSaturation: z.number().int().min(50).max(100), weightKg: z.number().min(0.2).max(500).optional(), heightCm: z.number().min(20).max(260).optional(), painScore: z.number().int().min(0).max(10).optional(), notes: z.string().trim().max(500).optional().default('') }).refine((value) => isBloodPressureValid(value.systolic, value.diastolic), { path: ['diastolic'], message: 'Diastolic pressure must be lower than systolic pressure.' });
const prescriptionSchema = z.object({ patient: z.string().refine(mongoose.isValidObjectId, 'Choose a valid patient.'), medication: z.string().trim().min(2).max(120), dosage: z.string().trim().min(1).max(100), frequency: z.string().trim().min(1).max(100), instructions: z.string().trim().max(500).optional().default('') });
const labSchema = z.object({ patient: z.string().refine(mongoose.isValidObjectId, 'Choose a valid patient.'), testName: z.string().trim().min(2).max(120), result: z.string().trim().min(1).max(1000), status: z.enum(['pending', 'final', 'abnormal']).default('pending'), collectedAt: z.iso.datetime() });
const invoiceSchema = z.object({ patient: z.string().refine(mongoose.isValidObjectId, 'Choose a valid patient.'), description: z.string().trim().min(2).max(200), amount: z.number().min(0).max(100000000), insuranceProvider: z.string().trim().max(120).optional().default('') });
const paymentSchema = z.object({ amount: z.number().positive().max(100000000) });
const admissionSchema = z.object({ patient: z.string().refine(mongoose.isValidObjectId, 'Choose a valid patient.'), ward: z.string().trim().min(1).max(80), bed: z.string().trim().min(1).max(40), reason: z.string().trim().max(500).optional().default('') });
const labOrderSchema = z.object({ patient: z.string().refine(mongoose.isValidObjectId, 'Choose a valid patient.'), testName: z.string().trim().min(2).max(120), priority: z.enum(['routine', 'urgent']).default('routine') });
const inventorySchema = z.object({ name: z.string().trim().min(2).max(120), sku: z.string().trim().min(1).max(50), quantity: z.number().min(0), reorderLevel: z.number().min(0), unit: z.string().trim().min(1).max(30) });
const dispenseSchema = z.object({ quantity: z.number().positive().max(100000), patient: z.string().refine(mongoose.isValidObjectId, 'Choose a valid patient.') });
const nursingNoteSchema = z.object({ patient: z.string().refine(mongoose.isValidObjectId, 'Choose a valid patient.'), note: z.string().trim().min(1).max(3000), carePlan: z.string().trim().max(3000).optional().default('') });

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
    const user = await User.findOne({ email: req.validatedBody.email }).select('+passwordHash active');
    if (user && !user.active) return res.status(401).json({ error: 'This account is inactive. Contact an administrator.' });
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
    const items = await User.find().select('name email role active createdAt').sort({ name: 1 }).limit(200).lean();
    res.json({ items });
  } catch (error) { next(error); }
});
app.patch('/api/users/:id/active', authenticate, allowRoles('admin'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || typeof req.body.active !== 'boolean') return res.status(400).json({ error: 'Provide a valid staff account and active status.' });
    if (req.params.id === req.user.id && !req.body.active) return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    const user = await User.findByIdAndUpdate(req.params.id, { active: req.body.active, ...(req.body.active ? {} : { $inc: { sessionVersion: 1 } }) }, { new: true }).select('name email role active');
    if (!user) return res.status(404).json({ error: 'Staff member not found.' });
    await audit(req, user.active ? 'staff.activated' : 'staff.deactivated', 'user', user.id, `${user.name}'s account was ${user.active ? 'activated' : 'deactivated'}.`);
    res.json(user);
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
app.get('/api/reports/summary', authenticate, allowRoles('admin'), async (_req, res, next) => {
  try {
    const [activeAdmissions, unpaidInvoices, billing, prescriptions, labs] = await Promise.all([
      Admission.countDocuments({ status: 'admitted' }),
      Invoice.countDocuments({ status: { $in: ['unpaid', 'part-paid'] } }),
      Invoice.aggregate([{ $match: { status: { $ne: 'void' } } }, { $group: { _id: null, billed: { $sum: '$amount' }, collected: { $sum: '$paidAmount' } } }]),
      Prescription.countDocuments({ status: 'active' }),
      LabResult.countDocuments({ status: 'pending' }),
    ]);
    res.json({ activeAdmissions, unpaidInvoices, billed: billing[0]?.billed || 0, collected: billing[0]?.collected || 0, activePrescriptions: prescriptions, pendingLabs: labs });
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
    await audit(req, 'patient.created', 'patient', patient.id, `Created patient record for ${patient.firstName} ${patient.lastName}.`, patient.id);
    if (req.user.role === 'receptionist') patient.set('bloodType', undefined).set('allergies', undefined);
    return res.status(201).json(patient);
  } catch (error) { next(error); }
});
app.patch('/api/patients/:id', authenticate, allowRoles('admin', 'doctor', 'nurse'), validate(patientSchema.partial()), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid patient ID.' });
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.validatedBody, { new: true, runValidators: true });
    if (patient) await audit(req, 'patient.updated', 'patient', patient.id, `Updated patient record for ${patient.firstName} ${patient.lastName}.`, patient.id);
    return patient ? res.json(patient) : res.status(404).json({ error: 'Patient not found.' });
  } catch (error) { next(error); }
});
app.get('/api/patients/:id/audit', authenticate, allowRoles('admin', 'doctor', 'nurse'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid patient ID.' });
    const items = await AuditLog.find({ patient: req.params.id }).sort({ createdAt: -1 }).limit(100).populate('actor', 'name role').lean();
    res.json({ items });
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
    const clash = await Appointment.exists({ clinician: req.validatedBody.clinician, startsAt: new Date(req.validatedBody.startsAt), status: { $in: ['scheduled', 'checked-in'] } });
    if (clash) return res.status(409).json({ error: 'This clinician already has an active appointment at that time.' });
    const item = await Appointment.create({ ...req.validatedBody, createdBy: req.user.id });
    await audit(req, 'appointment.created', 'appointment', item.id, `Scheduled ${item.department} appointment.`, item.patient);
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
    await audit(req, 'vitals.recorded', 'vital', item.id, 'Recorded vital signs.', req.params.id);
    return res.status(201).json(await item.populate('recordedBy', 'name role'));
  } catch (error) { next(error); }
});

app.get('/api/prescriptions', authenticate, allowRoles('admin', 'doctor', 'nurse'), async (req, res, next) => {
  try { const filter = req.query.patient ? { patient: req.query.patient } : {}; const items = await Prescription.find(filter).sort({ createdAt: -1 }).limit(200).populate('patient', 'firstName lastName patientNumber').populate('prescribedBy', 'name').lean(); res.json({ items }); } catch (error) { next(error); }
});
app.post('/api/prescriptions', authenticate, allowRoles('admin', 'doctor'), validate(prescriptionSchema), async (req, res, next) => {
  try { if (!(await Patient.exists({ _id: req.validatedBody.patient }))) return res.status(404).json({ error: 'Patient not found.' }); const item = await Prescription.create({ ...req.validatedBody, prescribedBy: req.user.id }); await audit(req, 'prescription.created', 'prescription', item.id, `Prescribed ${item.medication}.`, item.patient); res.status(201).json(item); } catch (error) { next(error); }
});
app.patch('/api/prescriptions/:id/status', authenticate, allowRoles('admin', 'doctor'), async (req, res, next) => {
  try { const parsed = z.enum(['active', 'completed', 'stopped']).safeParse(req.body.status); if (!parsed.success || !mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Provide a valid prescription status.' }); const item = await Prescription.findByIdAndUpdate(req.params.id, { status: parsed.data }, { new: true }); if (!item) return res.status(404).json({ error: 'Prescription not found.' }); await audit(req, 'prescription.updated', 'prescription', item.id, `Prescription marked ${item.status}.`, item.patient); res.json(item); } catch (error) { next(error); }
});
app.get('/api/labs', authenticate, allowRoles('admin', 'doctor', 'nurse'), async (req, res, next) => { try { const filter = req.query.patient ? { patient: req.query.patient } : {}; const items = await LabResult.find(filter).sort({ collectedAt: -1 }).limit(200).populate('patient', 'firstName lastName patientNumber').populate('recordedBy', 'name').lean(); res.json({ items }); } catch (error) { next(error); } });
app.post('/api/labs', authenticate, allowRoles('admin', 'doctor', 'nurse'), validate(labSchema), async (req, res, next) => { try { if (!(await Patient.exists({ _id: req.validatedBody.patient }))) return res.status(404).json({ error: 'Patient not found.' }); const item = await LabResult.create({ ...req.validatedBody, recordedBy: req.user.id }); await audit(req, 'lab.recorded', 'lab', item.id, `Recorded ${item.testName} result.`, item.patient); res.status(201).json(item); } catch (error) { next(error); } });
app.get('/api/invoices', authenticate, allowRoles('admin', 'receptionist'), async (req, res, next) => { try { const filter = req.query.patient ? { patient: req.query.patient } : {}; const items = await Invoice.find(filter).sort({ createdAt: -1 }).limit(200).populate('patient', 'firstName lastName patientNumber').lean(); res.json({ items }); } catch (error) { next(error); } });
app.post('/api/invoices', authenticate, allowRoles('admin', 'receptionist'), validate(invoiceSchema), async (req, res, next) => { try { if (!(await Patient.exists({ _id: req.validatedBody.patient }))) return res.status(404).json({ error: 'Patient not found.' }); const item = await Invoice.create({ ...req.validatedBody, createdBy: req.user.id }); await audit(req, 'invoice.created', 'invoice', item.id, `Created invoice for ${item.description}.`, item.patient); res.status(201).json(item); } catch (error) { next(error); } });
app.post('/api/invoices/:id/payments', authenticate, allowRoles('admin', 'receptionist'), validate(paymentSchema), async (req, res, next) => { try { if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid invoice ID.' }); const item = await Invoice.findById(req.params.id); if (!item || item.status === 'void') return res.status(404).json({ error: 'Payable invoice not found.' }); item.paidAmount = Math.min(item.amount, item.paidAmount + req.validatedBody.amount); item.status = item.paidAmount >= item.amount ? 'paid' : 'part-paid'; await item.save(); await audit(req, 'invoice.payment', 'invoice', item.id, `Recorded payment of ${req.validatedBody.amount}.`, item.patient); res.json(item); } catch (error) { next(error); } });
app.get('/api/admissions', authenticate, allowRoles('admin', 'doctor', 'nurse'), async (_req, res, next) => { try { const items = await Admission.find().sort({ admittedAt: -1 }).limit(200).populate('patient', 'firstName lastName patientNumber').lean(); res.json({ items }); } catch (error) { next(error); } });
app.post('/api/admissions', authenticate, allowRoles('admin', 'doctor', 'nurse'), validate(admissionSchema), async (req, res, next) => { try { if (!(await Patient.exists({ _id: req.validatedBody.patient }))) return res.status(404).json({ error: 'Patient not found.' }); const occupied = await Admission.exists({ ward: req.validatedBody.ward, bed: req.validatedBody.bed, status: 'admitted' }); if (occupied) return res.status(409).json({ error: 'That bed is currently occupied.' }); const item = await Admission.create({ ...req.validatedBody, admittedBy: req.user.id }); await audit(req, 'admission.created', 'admission', item.id, `Admitted patient to ${item.ward}, bed ${item.bed}.`, item.patient); res.status(201).json(item); } catch (error) { next(error); } });
app.patch('/api/admissions/:id/discharge', authenticate, allowRoles('admin', 'doctor', 'nurse'), async (req, res, next) => { try { if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid admission ID.' }); const item = await Admission.findOneAndUpdate({ _id: req.params.id, status: 'admitted' }, { status: 'discharged', dischargedAt: new Date() }, { new: true }); if (!item) return res.status(404).json({ error: 'Active admission not found.' }); await audit(req, 'admission.discharged', 'admission', item.id, 'Discharged patient.', item.patient); res.json(item); } catch (error) { next(error); } });
app.get('/api/lab-orders', authenticate, allowRoles('admin', 'doctor', 'nurse'), async (req, res, next) => { try { const filter = req.query.patient ? { patient: req.query.patient } : {}; const items = await LabOrder.find(filter).sort({ createdAt: -1 }).limit(200).populate('patient', 'firstName lastName patientNumber').lean(); res.json({ items }); } catch (error) { next(error); } });
app.post('/api/lab-orders', authenticate, allowRoles('admin', 'doctor'), validate(labOrderSchema), async (req, res, next) => { try { if (!(await Patient.exists({ _id: req.validatedBody.patient }))) return res.status(404).json({ error: 'Patient not found.' }); const item = await LabOrder.create({ ...req.validatedBody, orderedBy: req.user.id }); await audit(req, 'lab.order', 'lab-order', item.id, `Ordered ${item.testName}.`, item.patient); res.status(201).json(item); } catch (error) { next(error); } });
app.patch('/api/lab-orders/:id/status', authenticate, allowRoles('admin', 'doctor', 'nurse'), async (req, res, next) => { try { const status = z.enum(['ordered', 'collected', 'completed', 'cancelled']).safeParse(req.body.status); if (!status.success || !mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Choose a valid laboratory-order status.' }); const item = await LabOrder.findByIdAndUpdate(req.params.id, { status: status.data }, { new: true }); if (!item) return res.status(404).json({ error: 'Laboratory order not found.' }); await audit(req, 'lab.order.updated', 'lab-order', item.id, `Lab order marked ${item.status}.`, item.patient); res.json(item); } catch (error) { next(error); } });
app.get('/api/inventory', authenticate, allowRoles('admin', 'nurse'), async (_req, res, next) => { try { const items = await InventoryItem.find().sort({ name: 1 }).limit(500).lean(); res.json({ items }); } catch (error) { next(error); } });
app.post('/api/inventory', authenticate, allowRoles('admin'), validate(inventorySchema), async (req, res, next) => { try { const item = await InventoryItem.create(req.validatedBody); await audit(req, 'inventory.created', 'inventory', item.id, `Added inventory item ${item.name}.`); res.status(201).json(item); } catch (error) { next(error); } });
app.post('/api/inventory/:id/dispense', authenticate, allowRoles('admin', 'nurse'), validate(dispenseSchema), async (req, res, next) => { try { if (!mongoose.isValidObjectId(req.params.id) || !(await Patient.exists({ _id: req.validatedBody.patient }))) return res.status(400).json({ error: 'Provide a valid item and patient.' }); const item = await InventoryItem.findOneAndUpdate({ _id: req.params.id, quantity: { $gte: req.validatedBody.quantity } }, { $inc: { quantity: -req.validatedBody.quantity } }, { new: true }); if (!item) return res.status(409).json({ error: 'Insufficient inventory or item not found.' }); await audit(req, 'inventory.dispensed', 'inventory', item.id, `Dispensed ${req.validatedBody.quantity} ${item.unit} of ${item.name}.`, req.validatedBody.patient); res.json(item); } catch (error) { next(error); } });
app.get('/api/nursing-notes', authenticate, allowRoles('admin', 'doctor', 'nurse'), async (req, res, next) => { try { const filter = req.query.patient ? { patient: req.query.patient } : {}; const items = await NursingNote.find(filter).sort({ createdAt: -1 }).limit(200).populate('author', 'name role').lean(); res.json({ items }); } catch (error) { next(error); } });
app.post('/api/nursing-notes', authenticate, allowRoles('admin', 'nurse'), validate(nursingNoteSchema), async (req, res, next) => { try { if (!(await Patient.exists({ _id: req.validatedBody.patient }))) return res.status(404).json({ error: 'Patient not found.' }); const item = await NursingNote.create({ ...req.validatedBody, author: req.user.id }); await audit(req, 'nursing.note', 'nursing-note', item.id, 'Recorded nursing note.', item.patient); res.status(201).json(item); } catch (error) { next(error); } });

app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((error, _req, res, _next) => {
  if (error?.code === 11000) return res.status(409).json({ error: 'A record with that unique value already exists.' });
  if (error?.name === 'ValidationError' || error?.name === 'CastError') return res.status(400).json({ error: 'Submitted data is invalid.' });
  if (process.env.NODE_ENV !== 'production') console.error(error);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

export default app;
