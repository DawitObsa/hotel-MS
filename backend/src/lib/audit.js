import AuditLog from '../models/AuditLog.js';

export function audit(req, action, entityType, entityId, summary, patient) {
  return AuditLog.create({ actor: req.user.id, action, entityType, entityId: String(entityId), summary, ...(patient ? { patient } : {}) }).catch(() => {});
}
