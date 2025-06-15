// src/model/application/customer.model.ts
import { Document, Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// ✨ NEW: Interface for an embedded Cart Item ✨
export interface ICartItem {
  productId: mongoose.Types.ObjectId; // Reference to the Product document
  quantity: number;
  // Optional: For snapshotting product details at the time it's added to the cart.
  // This helps if product details (like name/price) change later, but you want to
  // show what it looked like when added to cart. Can add later if needed.
  // productName?: string;
  // productPrice?: number;
}

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
  orderHistory: mongoose.Types.ObjectId[]; // Array of Order IDs
  wishlist: Schema.Types.ObjectId[];     // References to tenant-specific Product documents
  // ✨ ADDED: The embedded cart ✨
  cart: ICartItem[];
  lastLoginAt?: Date;
  isActive: boolean; // Account status
  // Method to compare password (needed for TypeScript type safety)
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ✨ NEW: Mongoose Schema for the embedded Cart Item ✨
const CartItemSchema = new Schema<ICartItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  // productName: { type: String }, // Optional snapshot field
  // productPrice: { type: Number }, // Optional snapshot field
}, { _id: false }); // _id: false prevents Mongoose from creating a default `_id` for each subdocument.

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
  orderHistory: [{ // Array of ObjectIds
      type: mongoose.Types.ObjectId,
      ref: 'Order' // Reference to the Order model
  }],
  wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }], // Assuming a 'Product' model
  // ✨ ADDED: The cart array using the CartItemSchema ✨
  cart: [CartItemSchema],
  lastLoginAt: { type: Date },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Pre-save hook to hash password
CustomerSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to compare password
CustomerSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Note: Model will be retrieved dynamically via service for tenant DB.
const Customer = model<ICustomer>('Customer', CustomerSchema);

export default Customer;