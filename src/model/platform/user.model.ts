// src/models/platform/platformUser.model.ts

import { Document, Schema, model } from "mongoose";
import bcrypt from 'bcryptjs';

export interface IPlatformUser extends Document {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    role: 'platform_admin' | 'tenant_owner' | 'api_user' | 'support';
    status: 'active' | 'pending_email_verification' | 'disabled';
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    plan: 'free' | 'basic' | 'premium' | 'enterprise'; // The user's subscription plan on the platform
    // ✨ Add the method signature directly to the interface here, my dear! ✨
    comparePassword(candidatePassword: string): Promise<boolean>;
}

// ✨ 2. NEW Interface for the Public API Response Version of the User! ✨
export interface IPlatformUserResponse {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: 'platform_admin' | 'tenant_owner' | 'api_user' | 'support';
    status: 'active' | 'pending_email_verification' | 'disabled';
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const PlatformUserSchema = new Schema<IPlatformUser>({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: /^\S+@\S+\.\S+$/
    },
    passwordHash: {
        type: String,
        required: true
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
        default: 'tenant_owner'
    },
    status: {
        type: String,
        enum: ['active', 'pending_email_verification', 'disabled'],
        default: 'pending_email_verification'
    },
    lastLoginAt: {
        type: Date
    },
    // ✨ NEW: Add the plan field to the Mongoose Schema! ✨
    plan: {
        type: String,
        enum: ['free', 'basic', 'premium', 'enterprise'],
        required: true, // This field is now required for a platform user
        default: 'free' // All new platform users start on the 'free' plan
    }
}, {
    timestamps: true
});

// Pre-save hook (remains the same)
PlatformUserSchema.pre('save', async function (next) {
    if (this.isModified('passwordHash')) {
        const salt = await bcrypt.genSalt(10);
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    }
    next();
});

// Method to compare entered password with the hashed password! (remains the same)
PlatformUserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
};

export const PlatformUser = model<IPlatformUser>('PlatformUser', PlatformUserSchema);