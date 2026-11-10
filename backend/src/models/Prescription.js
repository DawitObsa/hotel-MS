import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  medication: { type: String, required: true, trim: true, maxlength: 120 },
  dosage: { type: String, required: true, trim: true, maxlength: 100 },
  frequency: { type: String, required: true, trim: true, maxlength: 100 },
  instructions: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['active', 'completed', 'stopped'], default: 'active', index: true },
  prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('Prescription', prescriptionSchema);
