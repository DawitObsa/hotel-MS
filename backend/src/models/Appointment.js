import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  clinician: { type: String, required: true, trim: true, maxlength: 100 },
  department: { type: String, required: true, trim: true, maxlength: 80 },
  startsAt: { type: Date, required: true, index: true },
  reason: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['scheduled', 'checked-in', 'completed', 'cancelled'], default: 'scheduled', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

appointmentSchema.index({ startsAt: 1, status: 1 });
export default mongoose.model('Appointment', appointmentSchema);
