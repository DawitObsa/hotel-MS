import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120, unique: true },
  sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 50, unique: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  reorderLevel: { type: Number, required: true, min: 0, default: 0 },
  unit: { type: String, trim: true, maxlength: 30, default: 'units' },
}, { timestamps: true });

export default mongoose.model('InventoryItem', inventoryItemSchema);
