import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  passwordChangedAt: { type: Date },
  sessionVersion: { type: Number, default: 0, min: 0 },
  role: { type: String, enum: ['admin', 'doctor', 'nurse', 'receptionist'], default: 'receptionist', required: true },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
