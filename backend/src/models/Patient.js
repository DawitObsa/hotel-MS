import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  patientNumber: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
  firstName: { type: String, required: true, trim: true, maxlength: 80 },
  lastName: { type: String, required: true, trim: true, maxlength: 80 },
  dateOfBirth: { type: Date, required: true },
  sex: { type: String, enum: ['female', 'male', 'other', 'undisclosed'], required: true },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
  address: { type: String, trim: true, maxlength: 300, default: '' },
  bloodType: { type: String, enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], default: '' },
  allergies: { type: String, trim: true, maxlength: 1000, default: '' },
  emergencyContactName: { type: String, trim: true, maxlength: 100, default: '' },
  emergencyContactPhone: { type: String, trim: true, maxlength: 30, default: '' },
  medicalHistory: { type: String, trim: true, maxlength: 4000, default: '' },
}, { timestamps: true });

patientSchema.index({ lastName: 1, firstName: 1 });
export default mongoose.model('Patient', patientSchema);
