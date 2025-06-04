import { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs'; // Still good for hashing passwords!
// Interface for a tenant-specific customer
export interface ICustomer extends Document {
    email: string;
    password: string; // Hashed, of course!
    firstName?: string; // Optional: Customer's first name
    lastName?: string;  // Optional: Customer's last name
    phoneNumber?: string; // Optional: Customer's phone number
    shippingAddresses: { // Array of customer's shipping addresses
        address1: string;
        address2?: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        isDefault: boolean;
    }[];
    orderHistory: Schema.Types.ObjectId[]; // References to tenant-specific Order documents
    wishlist: Schema.Types.ObjectId[];     // References to tenant-specific Product documents
    // ... other customer-specific fields like loyalty points, payment methods, etc.
    lastLoginAt?: Date;
    isActive: boolean; // Account status
}

// Mongoose Schema for the Tenant Customer model
const CustomerSchema = new Schema<ICustomer>({
    email: {
        type: String,
        required: true,
        unique: true, // Unique per tenant database!
        lowercase: true,
        trim: true,
        match: /^\S+@\S+\.\S+$/
    },
    password: {
        type: String,
        required: true,
        minlength: 6 
    },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    shippingAddresses: [{
        address1: { type: String, required: true },
        address2: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true },
        isDefault: { type: Boolean, default: false }
    }],
    orderHistory: [{ type: Schema.Types.ObjectId, ref: 'Order' }], // Assuming an 'Order' model
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }], // Assuming a 'Product' model
    lastLoginAt: { type: Date },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true 
});

// Pre-save hook to hash password (just like for staff users!)
CustomerSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// Method to compare password (just like for staff users!)
CustomerSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Note: Model will be retrieved dynamically via service for tenant DB.