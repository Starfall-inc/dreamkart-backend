import Tenant, { ITenant } from "../../model/platform/tenant.model";
import mongoose from "mongoose"; // We need mongoose for database connection management

// Importing your application-level models for tenant databases!
// Assuming these paths are correct relative to your TenantService
import Category, { ICategory } from "../../model/application/category.model";
import Product, { IProduct } from "../../model/application/product.model";
import { UserSchema, IUser } from "../../model/application/user.model"; // Assuming you have a User model for tenant users
import { getTenantDb } from "../../connection/tenantDb"; // Utility to get the tenant-specific database connection

// You would also import other application models like Customer, Order, Cart if you have them
// import Customer, { ICustomer } from "../../model/application/customer.model";
// import Order, { IOrder } from "../../model/application/order.model";
// import Cart, { ICart } from "../../model/application/cart.model";


class TenantService {

    /**
     * Get all tenants from the platform database
     */
    async getTenants(): Promise<ITenant[]> {
        try {
            const tenants = await Tenant.find({});
            return tenants;
        } catch (error) {
            console.error("{TenantService -> getTenants} Error fetching tenants:", error);
            throw new Error('Failed to retrieve tenants.');
        }
    }

    /**
     * Get a tenant by ID from the platform database
     * @param id - Tenant ID (from the platform database)
     */
    async getTenantById(id: string): Promise<ITenant> {
        try {
            const tenant = await Tenant.findById(id);
            if (!tenant) {
                // If tenant not found, throw a specific error
                throw new Error(`Tenant with ID ${id} not found.`);
            }
            return tenant;
        } catch (error) {
            console.error(`{TenantService -> getTenantById} Error retrieving tenant with ID ${id}:`, error);
            // Re-throw a generic error to the caller for security/abstraction
            throw new Error("Failed to retrieve tenant.");
        }
    }

    /**
     * Create a new tenant and their dedicated MongoDB database,
     * and also create the initial owner user for that tenant.
     * This is where the multi-tenant magic happens! ✨
     * @param tenantData - Data for the new tenant (name, ownerId, email, plan, settings)
     * @param initialTenantUser - Data for the first user to be created in the tenant's database (email, password, name).
     * This user will be assigned the 'owner' role for the tenant.
     */
    public async createTenant(
        tenantData: {
            name: string;
            ownerId: mongoose.Types.ObjectId; // This is the PlatformUser's ID
            email: string; // Tenant's contact email
            plan?: 'free' | 'basic' | 'premium' | 'enterprise';
            settings?: Record<string, any>;
        },
        initialTenantUser: {
            email: string;
            password: string;
            name: string;
        }
    ): Promise<ITenant> {
        let newTenant: ITenant | null = null;
        try {
            // 1. Create and save the tenant record in the platform database
            newTenant = new Tenant(tenantData);
            await newTenant.save();
            console.log(`{TenantService -> createTenant} Tenant record '${newTenant.name}' saved in platform DB.`);

            // 2. Programmatically create the dedicated database for the new tenant
            const tenantDb = getTenantDb(newTenant.databaseName); // Using our centralized utility!

            // 3. Create initial collections based on your application models in the new tenant database
            // For Category Model:
            const TenantCategoryModel = tenantDb.model<ICategory>('Category', Category.schema);
            await TenantCategoryModel.createCollection();
            await TenantCategoryModel.createIndexes();

            // For Product Model:
            const TenantProductModel = tenantDb.model<IProduct>('Product', Product.schema);
            await TenantProductModel.createCollection();
            await TenantProductModel.createIndexes();

            // ✨ 4. Create the initial owner user for this new tenant's database! ✨
            // We need to get the User model for this specific tenant's database
            const TenantUserModel = tenantDb.model<IUser>('User', UserSchema);

            const initialUser = new TenantUserModel({
                email: initialTenantUser.email,
                password: initialTenantUser.password, // Password will be hashed by UserSchema's pre-save hook!
                name: initialTenantUser.name,
                role: 'owner', // The first user is the owner of this tenant
                isActive: true
            });
            await initialUser.save();
            console.log(`{TenantService -> createTenant} Initial owner user '${initialUser.email}' created for tenant '${newTenant.name}' in its dedicated DB.`);


            console.log(`{TenantService -> createTenant} Successfully created database '${newTenant.databaseName}' and initialized collections for tenant '${newTenant.name}'.`);

            return newTenant;

        } catch (error: any) {
            console.error(`{TenantService -> createTenant} Failed to create tenant '${tenantData.name}' or its database/initial user:`, error);

            // IMPORTANT: If database creation or collection/user initialization fails, rollback the tenant record creation
            if (newTenant && newTenant._id) {
                try {
                    const tenantDbToDrop = getTenantDb(newTenant.databaseName); // Use our utility for dropping
                    await tenantDbToDrop.dropDatabase();
                    console.warn(`{TenantService -> createTenant} Partially created database '${newTenant.databaseName}' dropped during rollback.`);
                } catch (dropError) {
                    console.error(`{TenantService -> createTenant} ERROR during database drop rollback for '${newTenant.databaseName}':`, dropError);
                }
                try {
                    await Tenant.findByIdAndDelete(newTenant._id);
                    console.warn(`{TenantService -> createTenant} Rolled back tenant record for '${newTenant.name}' due to database/user creation failure.`);
                } catch (rollbackError) {
                    console.error(`{TenantService -> createTenant} ERROR during tenant record rollback for '${newTenant.name}':`, rollbackError);
                }
            }
            throw new Error(`Failed to create tenant: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Update an existing tenant's details in the platform database.
     * @param id - Tenant ID
     * @param updateData - Data to update
     */
    async updateTenant(id: string, updateData: Partial<ITenant>): Promise<ITenant> {
        try {
            const { databaseName, _id, ...safeUpdateData } = updateData;

            const updatedTenant = await Tenant.findByIdAndUpdate(
                id,
                safeUpdateData,
                { new: true, runValidators: true }
            );

            if (!updatedTenant) {
                throw new Error(`Tenant with ID ${id} not found for update.`);
            }
            return updatedTenant;
        } catch (error) {
            console.error(`{TenantService -> updateTenant} Failed to update tenant with ID ${id}:`, error);
            throw new Error("Failed to update tenant.");
        }
    }

    /**
     * Delete a tenant record from the platform database and drop their dedicated database.
     * Use with extreme caution! This is destructive. 💣
     * @param id - Tenant ID
     */
    async deleteTenant(id: string): Promise<void> {
        let tenantToDelete: ITenant | null = null;
        try {
            tenantToDelete = await Tenant.findById(id);
            if (!tenantToDelete) {
                throw new Error(`Tenant with ID ${id} not found for deletion.`);
            }

            const tenantDb = mongoose.connection.useDb(tenantToDelete.databaseName);
            await tenantDb.dropDatabase();
            console.log(`{TenantService -> deleteTenant} Successfully dropped database '${tenantToDelete.databaseName}' for tenant '${tenantToDelete.name}'.`);

            await Tenant.findByIdAndDelete(id);
            console.log(`{TenantService -> deleteTenant} Successfully deleted tenant record for '${tenantToDelete.name}' from platform database.`);

        } catch (error) {
            console.error(`{TenantService -> deleteTenant} Failed to delete tenant with ID ${id} or its database:`, error);
            throw new Error("Failed to delete tenant and its associated database.");
        }
    }

    /**
     * check if a tenant exists by ID
     * @param id - Tenant ID
     * @return boolean - true if tenant exists, false otherwise
     * */
    async tenantExists(id: string): Promise<boolean> {
        try {
            const tenant = await Tenant.findById(id);
            return !!tenant; // Returns true if tenant exists, false otherwise
        } catch (error) {
            console.error(`{TenantService -> tenantExists} Error checking existence of tenant with ID ${id}:`, error);
            throw new Error("Failed to check tenant existence.");
        }
    }

    /**
     * check if a tenant exists by database name
     * @param databaseName - Tenant database name
     * @return boolean - true if tenant exists, false otherwise
     * */
    async tenantExistsByDatabaseName(databaseName: string): Promise<boolean> {
        try {
            const tenant = await Tenant.findOne({ databaseName });
            return !!tenant; // Returns true if tenant exists, false otherwise
        } catch (error) {
            console.error(`{TenantService -> tenantExistsByDatabaseName} Error checking existence of tenant with database name ${databaseName}:`, error);
            throw new Error("Failed to check tenant existence by database name.");
        }
    }
}

export default new TenantService();