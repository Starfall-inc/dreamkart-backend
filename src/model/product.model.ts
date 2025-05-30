import { Document, Schema, model } from "mongoose";
import { ICategory } from "./category.model"; // Importing the ICategory interface

interface IProduct extends Document{
    // ✨ You already have 'sku' defined here! ✨
    sku: string;
    name: string;
    price: number;
    image: string[];
    category: Schema.Types.ObjectId | ICategory; // This is correct!
    description: string;
    attributes?: Record<string, any>; // Optional attributes field

}

const ProductSchema = new Schema<IProduct>({
    // ✨ And 'sku' is defined as a separate field here, with unique: true! ✨
    sku: {
        type: String,
        required: true,
        unique: true, // This ensures SKUs are unique across products
    },
    name: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    image: {
        type: [String],
        default: [],
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category', // This beautiful reference is perfect!
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    attributes: {
        type: Schema.Types.Mixed, // This allows for flexible attributes
        default: {}
    }
}, {
    timestamps: true // This is also correct!
    // ✨ IMPORTANT: You correctly removed `_id: false` from schema options.
    // This means Mongoose WILL generate its own `_id` (ObjectId) by default! ✨
});

const Product = model<IProduct>('Product', ProductSchema);

export default Product; // This is the more conventional way to export a single main item!