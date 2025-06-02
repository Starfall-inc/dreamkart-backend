import { Document, Schema, model } from "mongoose";

// This interface defines the shape of a Subscription Plan document.
export interface ISubscriptionPlan extends Document {
    name: string; // E.g., "Free", "Basic", "Premium"
    price: number; // Monthly/annual price of the plan
    features: string[]; // Array of strings describing features (e.g., ["unlimited_products", "24/7_support"])
    storageLimitGB?: number; // Max storage limit for tenants on this plan
    productLimit?: number; // Max number of products a tenant can have on this plan
    description?: string; // A brief description of the plan
    isActive: boolean; // Whether this plan is currently active/available
    createdAt: Date;
    updatedAt: Date;
}

// The Mongoose Schema for the SubscriptionPlan model
const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0 // Price cannot be negative
    },
    features: [{
        type: String,
        trim: true
    }],
    storageLimitGB: {
        type: Number,
        min: 0
    },
    productLimit: {
        type: Number,
        min: 0
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true // Plans are active by default when created
    }
}, {
    timestamps: true
});

// This is the magical line, darling! ✨
export const SubscriptionPlan = model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
