// src/model/application/product.model.ts

import { Document, Schema, model } from "mongoose";
import { ICategory } from "./category.model"; // Importing the ICategory interface

interface IProduct extends Document{
    sku: string;
    name: string;
    price: number;
    stock: number; // The quantity of this product available
    image: string[];
    category: Schema.Types.ObjectId | ICategory;
    description: string;
    attributes?: Record<string, any>;
}

const ProductSchema = new Schema<IProduct>({
    sku: {
        type: String,
        required: true,
        unique: true,
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
    // ✨ ADDED STOCK FIELD IN SCHEMA ✨
    stock: {
        type: Number,
        required: true,
        min: 0, // Stock cannot be negative
        default: 0 // Default to 0 if not provided
    },
    image: {
        type: [String],
        default: [],
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    attributes: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

const Product = model<IProduct>('Product', ProductSchema);

export default Product;
export type { IProduct };
export { ProductSchema };