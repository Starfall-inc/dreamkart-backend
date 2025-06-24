import { Document, Schema, model } from "mongoose";
import mongoose from "mongoose";

// Interface defining the shape of a Tenant document
export interface ITenant extends Document {
    name: string;
    slug: string; // URL-friendly identifier for the tenant
    ownerId: Schema.Types.ObjectId; // Reference to the platform user who owns this tenant
    email: string; // Contact email for the tenant
    status: 'active' | 'pending' | 'suspended' | 'inactive'; // Current operational status
    databaseName: string; // The unique name of this tenant's dedicated MongoDB database
    plan: 'free' | 'basic' | 'premium' | 'enterprise'; // Subscription plan
    settings: Record<string, any>; // Flexible object for various tenant-specific settings
    theme: string;
    themeSettings: Record<string, string>;
}

// Mongoose Schema for the Tenant model
const TenantSchema = new Schema<ITenant>({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    slug: {
        type: String,
        // REMOVED: required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    ownerId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User' // Assuming your core User model is named 'User'
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: /^\S+@\S+\.\S+$/ // Basic email regex validation
    },
    status: {
        type: String,
        enum: ['active', 'pending', 'suspended', 'inactive'],
        default: 'pending' // Default status when a new tenant registers
    },
    databaseName: {
        type: String,
        // REMOVED: required: true,
        unique: true,
    },
    plan: {
        type: String,
        enum: ['free', 'basic', 'premium', 'enterprise'],
        default: 'free'
    },
    settings: {
        type: Object, // Stores flexible key-value settings for the tenant
        default: {}
    },
    theme: {
        type: String,
        default: 'sakurapink'
    },
    themeSettings: {
        type: Map,
        of: String,
        default: {}
    },
}, {
    timestamps: true // Automatically adds `createdAt` and `updatedAt` fields
});

// This is where the magic happens for `slug` and `databaseName` generation! ✨
// We'll use a pre-save hook to automatically generate these before saving the tenant.
TenantSchema.pre('save', function(next) {
    // Generate slug from the name if it's new or the name has been modified
    if (this.isModified('name') || this.isNew) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric, keep spaces and hyphens
            .replace(/\s+/g, '-')          // Replace spaces with hyphens
            .replace(/^-+|-+$/g, '');      // Trim hyphens from start/end
    }

    // Generate the unique database name if it's a new tenant and not already set
    if (this.isNew && !this.databaseName) {
        // Use a more robust unique ID here, like a UUID or a combination of slug and a short random string.
        // Relying on _id for databaseName *within* the pre-save hook can be tricky because
        // _id might not be fully generated/assigned until later in the save process.
        // A common pattern is to use a dedicated slug for database name or a UUID.
        // For now, let's use the slug to form the database name, which is often sufficient.
        const baseName = this.slug || this.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        this.databaseName = `db_${baseName.substring(0, 20)}_${new mongoose.Types.ObjectId().toString().substring(0, 8)}`; 
        // Using substring to keep the name shorter and combining slug with a partial ObjectId for uniqueness.
        // This makes the database name more predictable and readable.
        // Or, if you want full ObjectId unique DB name: this.databaseName = `db_${new mongoose.Types.ObjectId()}`;

    }
    next(); // Continue with the save operation
});


// This is the magical line, darling! ✨
export const Tenant = model<ITenant>('Tenant', TenantSchema);
export default Tenant;