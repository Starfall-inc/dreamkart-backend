// src/models/application/user.model.ts
import mongoose from 'mongoose';
import { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs'; // Don't forget to install: npm install bcryptjs @types/bcryptjs

// Interface defining the shape of a Tenant User document (for staff/management)
interface IUser extends Document {
    email: string;
    password: string; // Stored as a hashed string, of course!
    name: string; // The user's name (e.g., John Doe)
    role: 'owner' | 'admin' | 'manager' | 'employee'; // Their role within THIS specific tenant's shop
    isActive: boolean; // Account status (e.g., active, suspended by owner/admin)
    lastLoginAt?: Date; // Optional: To track when they last logged in
    // This User document physically resides in the tenant's dedicated database.
    comparePassword(candidatePassword: string): Promise<boolean>;
}

// Mongoose Schema for the Tenant User model
const UserSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true, // Unique per tenant database!
        lowercase: true,
        trim: true,
        match: /^\S+@\S+\.\S+$/ // Basic email regex validation
    },
    password: {
        type: String,
        required: true,
        minlength: 6 // A good start for password length!
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'manager', 'employee'], // Roles for staff users
        default: 'employee' // Default role for a newly created staff member
    },
    isActive: {
        type: Boolean,
        default: true // By default, account is active upon creation
    },
    lastLoginAt: {
        type: Date
    }
}, {
    timestamps: true // Automatically adds `createdAt` and `updatedAt` fields
});

// ✨ Pre-save hook to hash password before saving! This is SUPER important for security! ✨
UserSchema.pre('save', async function (next) {
    // Only hash the password if it's new or if it has been modified (e.g., user changed password)
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10); // Generate a salt (a random string to make hashes unique)
        this.password = await bcrypt.hash(this.password, salt); // Hash the password with the salt
    }
    next(); // Continue with the save operation
});

// ✨ Method to compare entered password with the hashed password! ✨
// This method will be available on instances of the User model.
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    // 'this.password' refers to the hashed password stored in the database
    return await bcrypt.compare(candidatePassword, this.password);
};

// We won't export 'model' directly here, my dear!
// Instead, our UserService will dynamically get the User model
// from the correct tenant-specific Mongoose connection.
const UserModel = mongoose.model<IUser>('User', UserSchema);
export { UserSchema, UserModel }; // Export the interface and schema for use in services
export type { IUser }; // Export the interface for type safety in services