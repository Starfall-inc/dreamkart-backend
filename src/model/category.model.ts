import { Document, Schema, model } from "mongoose"; 

export interface ICategory extends Document{
    name: string;
    slug: string;
    images: string[];
    description: string;
}

const CategorySchema = new Schema<ICategory>({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    images: [{ type: String }],
    description: { type: String }
    }, {
    timestamps: true
});

// This is the magical line, darling! ✨
const Category = model<ICategory>('Category', CategorySchema);
export default Category;