import mongoose from 'mongoose';

const vitalSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  recordedAt: { type: Date, required: true, default: Date.now, index: true },
  systolic: { type: Number, required: true, min: 40, max: 300 },
  diastolic: { type: Number, required: true, min: 20, max: 200 },
  pulse: { type: Number, required: true, min: 20, max: 250 },
  temperatureC: { type: Number, required: true, min: 25, max: 45 },
  respiratoryRate: { type: Number, required: true, min: 1, max: 80 },
  oxygenSaturation: { type: Number, required: true, min: 50, max: 100 },
  weightKg: { type: Number, min: 0.2, max: 500 },
  heightCm: { type: Number, min: 20, max: 260 },
  painScore: { type: Number, min: 0, max: 10 },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

vitalSchema.index({ patient: 1, recordedAt: -1 });
export default mongoose.model('Vital', vitalSchema);
