import { Schema, model, Document } from 'mongoose';
// This interface defines the shape of an Audit Log document.
export interface IAuditLog extends Document {
    userId: Schema.Types.ObjectId; // The ID of the User who performed the action
    action: string; // Description of the action (e.g., "user_login", "tenant_created")
    targetId?: Schema.Types.ObjectId | string; // Optional: ID of the resource affected (e.g., tenant ID)
    targetCollection?: string; // Optional: Collection name of the affected resource
    details?: Record<string, any>; // Optional: Additional context about the action (e.g., IP address, changes)
    ipAddress?: string; // IP address from where the action originated
    userAgent?: string; // User-Agent string from the request
    createdAt: Date; // Timestamp when the action occurred (managed by timestamps)
}

// The Mongoose Schema for the AuditLog model
const AuditLogSchema = new Schema<IAuditLog>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User' // Reference to the User model
    },
    action: {
        type: String,
        required: true,
        trim: true
    },
    targetId: {
        type: Schema.Types.ObjectId // Can be ObjectId for other models
    },
    targetCollection: {
        type: String,
        trim: true // E.g., 'Tenants', 'Users', 'PlatformSettings'
    },
    details: {
        type: Object, // Flexible object for extra details
        default: {}
    },
    ipAddress: {
        type: String,
        trim: true
    },
    userAgent: {
        type: String,
        trim: true
    }
}, {
    timestamps: true // Automatically adds createdAt
    // Note: Audit logs typically only need createdAt, not updatedAt, as they are immutable records.
    // However, timestamps: true adds both, which is fine.
});

// This is the magical line, darling! ✨
export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);