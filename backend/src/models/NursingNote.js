import mongoose from 'mongoose';

const nursingNoteSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  note: { type: String, required: true, trim: true, maxlength: 3000 },
  carePlan: { type: String, trim: true, maxlength: 3000, default: '' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('NursingNote', nursingNoteSchema);
