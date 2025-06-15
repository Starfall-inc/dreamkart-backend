// src/model/application/order.model.ts

import mongoose, { Document, Schema } from 'mongoose';

// 📦 Interface for individual items within an order
export interface IOrderItem extends Document {
    // We don't need _id here because the schema for OrderItemSchema has _id: false
    productId: mongoose.Types.ObjectId;
    name: string;
    sku: string;
    image: string; // Storing the primary image URL
    price: number; // Price at the time of order
    quantity: number;
}

// 🏠 Interface for shipping address details
export interface IShippingAddress {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

// 🛒 Main interface for an Order
export interface IOrder extends Document {
    // ✨ THIS IS THE CRUCIAL LINE TO ADD/UPDATE! ✨
    _id: mongoose.Types.ObjectId; // Explicitly define _id as ObjectId

    customerId: mongoose.Types.ObjectId;
    orderItems: IOrderItem[];
    totalAmount: number;
    orderDate: Date;
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
    shippingAddress: IShippingAddress;
    contactPhone: string;
    isPaid: boolean;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

// 📦 Schema for individual items within an order
const OrderItemSchema: Schema<IOrderItem> = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

// 🏠 Schema for shipping address details
const ShippingAddressSchema: Schema<IShippingAddress> = new Schema({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true }
}, { _id: false });

// 🛒 Main Schema for the Order
export const OrderSchema: Schema<IOrder> = new Schema({
    // _id field is automatically handled by Mongoose if not specified,
    // but explicitly defining it in the interface helps TypeScript.
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
        index: true
    },
    orderItems: {
        type: [OrderItemSchema],
        required: true,
        validate: {
            validator: (arr: any[]) => arr.length > 0,
            message: 'An order must have at least one item! 😠'
        }
    },
    totalAmount: { type: Number, required: true, min: 0 },
    orderDate: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'],
        default: 'pending',
        required: true
    },
    shippingAddress: {
        type: ShippingAddressSchema,
        required: true
    },
    contactPhone: { type: String, required: true },
    isPaid: { type: Boolean, default: false },
    notes: { type: String }
}, {
    timestamps: true
});

// No direct model export for multi-tenancy