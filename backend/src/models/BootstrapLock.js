import mongoose from 'mongoose';

const bootstrapLockSchema = new mongoose.Schema({
  _id: { type: String },
}, { versionKey: false, collection: 'system_locks' });

export default mongoose.model('BootstrapLock', bootstrapLockSchema);
