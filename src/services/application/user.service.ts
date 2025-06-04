// src/services/application/user.service.ts

import mongoose from 'mongoose';
import { IUser, UserSchema } from '../../model/application/user.model'
import { getTenantDb } from '../../connection/tenantDb'; // Function to get tenant-specific DB connection

class UserService {
    private getTenantUserModel(tenantDbName: string) {
        const tenantDb = getTenantDb(tenantDbName); // Using the encapsulated function!

        if (!tenantDb.models.User) {
            console.log(`{UserService -> getTenantUserModel} Defining User model for DB: ${tenantDbName}`);
            return tenantDb.model<IUser>('User', UserSchema);
        }
        console.log(`{UserService -> getTenantUserModel} Reusing User model for DB: ${tenantDbName}`);
        return tenantDb.models.User as mongoose.Model<IUser>;
    }

    public async createUser(tenantDbName: string, userData: Partial<IUser>): Promise<IUser> {
        console.log(`{UserService -> createUser} Attempting to create user for tenant DB: ${tenantDbName}`);
        const UserModel = this.getTenantUserModel(tenantDbName);
        const user = new UserModel(userData);
        await user.save();
        console.log(`{UserService -> createUser} User '${user.email}' created successfully in tenant DB: ${tenantDbName}! 🎉`);
        return user;
    }

    public async findByEmail(tenantDbName: string, email: string): Promise<IUser | null> {
        console.log(`{UserService -> findByEmail} Searching for user by email '${email}' in tenant DB: ${tenantDbName}`);
        const UserModel = this.getTenantUserModel(tenantDbName);
        const user = await UserModel.findOne({ email }).exec();
        if (user) {
            console.log(`{UserService -> findByEmail} User '${email}' found!`);
        } else {
            console.log(`{UserService -> findByEmail} User with email '${email}' not found.`);
        }
        return user;
    }

    public async findById(tenantDbName: string, userId: string): Promise<IUser | null> {
        console.log(`{UserService -> findById} Searching for user by ID '${userId}' in tenant DB: ${tenantDbName}`);
        const UserModel = this.getTenantUserModel(tenantDbName);
        const user = await UserModel.findById(userId).exec();
        if (user) {
            console.log(`{UserService -> findById} User ID '${userId}' found!`);
        } else {
            console.log(`{UserService -> findById} User ID '${userId}' not found.`);
        }
        return user;
    }
}

export default new UserService();