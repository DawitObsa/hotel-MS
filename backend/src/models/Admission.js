import mongoose from 'mongoose';

const admissionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  ward: { type: String, required: true, trim: true, maxlength: 80 },
  bed: { type: String, required: true, trim: true, maxlength: 40 },
  reason: { type: String, trim: true, maxlength: 500, default: '' },
  admittedAt: { type: Date, default: Date.now, required: true },
  dischargedAt: { type: Date },
  status: { type: String, enum: ['admitted', 'discharged'], default: 'admitted', index: true },
  admittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

admissionSchema.index({ ward: 1, bed: 1, status: 1 });
export default mongoose.model('Admission', admissionSchema);
