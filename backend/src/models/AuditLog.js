import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, maxlength: 80 },
  entityType: { type: String, required: true, maxlength: 40, index: true },
  entityId: { type: String, required: true, maxlength: 48 },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', index: true },
  summary: { type: String, required: true, maxlength: 300 },
}, { timestamps: true });

auditLogSchema.index({ patient: 1, createdAt: -1 });
export default mongoose.model('AuditLog', auditLogSchema);
