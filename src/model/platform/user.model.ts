import { Document, Schema, model } from "mongoose";

// --- 1. User Model (Platform Users / Shop Owners / Admins) ---
// This interface defines the shape of a User document in your platform database.
export interface IUser extends Document {
    email: string;
    passwordHash: string; // Storing the hashed password (NEVER plain text!)
    firstName?: string; // Optional first name
    lastName?: string; // Optional last name
    role: 'platform_admin' | 'tenant_owner' | 'api_user' | 'support'; // Defines user permissions
    status: 'active' | 'pending_email_verification' | 'disabled'; // User account status
    lastLoginAt?: Date; // Timestamp of the last login
    createdAt: Date; // Automatically managed by timestamps: true
    updatedAt: Date; // Automatically managed by timestamps: true
}

// The Mongoose Schema for the User model
const UserSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: /^\S+@\S+\.\S+$/ // Basic email format validation
    },
    passwordHash: {
        type: String,
        required: true // Will store the bcrypt hashed password
    },
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    role: {
        type: String,
        enum: ['platform_admin', 'tenant_owner', 'api_user', 'support'],
        required: true,
        default: 'tenant_owner' // Default role for new sign-ups
    },
    status: {
        type: String,
        enum: ['active', 'pending_email_verification', 'disabled'],
        default: 'pending_email_verification' // New users might need to verify email
    },
    lastLoginAt: {
        type: Date
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

// This is the magical line, darling! ✨
export const User = model<IUser>('User', UserSchema);