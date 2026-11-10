import mongoose from 'mongoose';

const labOrderSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  testName: { type: String, required: true, trim: true, maxlength: 120 },
  priority: { type: String, enum: ['routine', 'urgent'], default: 'routine' },
  status: { type: String, enum: ['ordered', 'collected', 'completed', 'cancelled'], default: 'ordered', index: true },
  orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('LabOrder', labOrderSchema);
