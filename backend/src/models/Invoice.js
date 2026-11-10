import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  description: { type: String, required: true, trim: true, maxlength: 200 },
  amount: { type: Number, required: true, min: 0, max: 100000000 },
  paidAmount: { type: Number, default: 0, min: 0, max: 100000000 },
  status: { type: String, enum: ['unpaid', 'part-paid', 'paid', 'void'], default: 'unpaid', index: true },
  insuranceProvider: { type: String, trim: true, maxlength: 120, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('Invoice', invoiceSchema);
