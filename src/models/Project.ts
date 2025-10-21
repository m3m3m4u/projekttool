import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true }, // 'text' or 'file'
  content: { type: mongoose.Schema.Types.Mixed, default: {} }, // object with text and files
  date: { type: Date, required: true },
  order: { type: Number, required: true },
}, { strict: false });

const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  members: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  order: { type: Number, required: true },
  items: [ItemSchema],
}, { strict: false });

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);