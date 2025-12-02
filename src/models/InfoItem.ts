import mongoose, { Schema, Document } from 'mongoose';

export interface IInfoFile {
  fileName: string;
  fileUrl: string;
  originalName: string;
  uploadedAt: Date;
}

export interface IInfoItem extends Document {
  category: 'personalvertretung' | 'kurse' | 'mittwochsnotizen';
  title: string;
  files: IInfoFile[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const InfoFileSchema = new Schema({
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  originalName: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

const InfoItemSchema = new Schema({
  category: { 
    type: String, 
    required: true, 
    enum: ['personalvertretung', 'kurse', 'mittwochsnotizen'] 
  },
  title: { type: String, required: true },
  files: [InfoFileSchema],
  order: { type: Number, default: 0 }
}, { timestamps: true });

// Index für schnelle Abfragen nach Kategorie und Sortierung
InfoItemSchema.index({ category: 1, order: -1 });

export default mongoose.models.InfoItem || mongoose.model<IInfoItem>('InfoItem', InfoItemSchema);
