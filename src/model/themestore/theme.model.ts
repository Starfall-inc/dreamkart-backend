import { Schema, model, Document } from 'mongoose';

export interface ITheme extends Document {
  name: string;
  slug: string;
  cdnUrl: string;
  description?: string;
  tags?: string[];
  isFree?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ThemeSchema = new Schema<ITheme>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  cdnUrl: { type: String, required: true },
  description: { type: String },
  tags: [{ type: String }],
  isFree: { type: Boolean, default: true }
}, { timestamps: true });

export default model<ITheme>('Theme', ThemeSchema);
