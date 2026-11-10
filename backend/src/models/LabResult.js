import mongoose from 'mongoose';

const labResultSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  testName: { type: String, required: true, trim: true, maxlength: 120 },
  result: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['pending', 'final', 'abnormal'], default: 'pending', index: true },
  collectedAt: { type: Date, required: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('LabResult', labResultSchema);
