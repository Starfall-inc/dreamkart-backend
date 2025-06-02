import mongoose from "mongoose"; // Don't forget to import mongoose!
import Category, { ICategory } from "../../model/application/category.model";

class CategoryService {

    // Helper method to get the correct Category model for a given tenant
    // This is the core multi-tenancy piece for models! 🔑
    private getTenantCategoryModel(tenantDbName: string) {
        const tenantDb = mongoose.connection.useDb(tenantDbName, { useCache: true });
        // Return the Mongoose Model specific to this tenant's database
        console.log(`{CategoryService -> getTenantCategoryModel} Using tenant DB: ${tenantDbName}`);
        return tenantDb.model<ICategory>('Category', Category.schema);
    }

    /**
     * Get all categories for a specific tenant
     * @param tenantDbName - The name of the tenant's database
     */
    async getCategories(tenantDbName: string): Promise<ICategory[]> { // Added tenantDbName parameter
        try {
            const TenantCategory = this.getTenantCategoryModel(tenantDbName); // Use tenant-specific model
            const categories = await TenantCategory.find({});
            return categories;
        } catch (error) {
            console.error(`{CategoryService -> getCategories} Cannot fetch categories for tenant DB '${tenantDbName}':`, error);
            throw new Error('Failed to retrieve categories.');
        }
    }

    /**
     * Get a category by slug for a specific tenant
     * @param tenantDbName - The name of the tenant's database
     * @param slug - The slug of the category
     */
    async getCategoryBySlug(tenantDbName: string, slug: string): Promise<ICategory | null> { // Added tenantDbName parameter
        try {
            const TenantCategory = this.getTenantCategoryModel(tenantDbName); // Use tenant-specific model
            const category = await TenantCategory.findOne({ slug });
            return category;
        } catch (error) {
            console.error(`{CategoryService -> getCategoryBySlug} Failed to retrieve category by slug '${slug}' for tenant DB '${tenantDbName}':`, error);
            throw new Error("Failed to retrieve category.");
        }
    }

    /**
     * Get a category by ID for a specific tenant
     * @param tenantDbName - The name of the tenant's database
     * @param id - The ID of the category
     */
    async getCategoryById(tenantDbName: string, id: string): Promise<ICategory | null> { // Added tenantDbName parameter
        try {
            const TenantCategory = this.getTenantCategoryModel(tenantDbName); // Use tenant-specific model
            const category = await TenantCategory.findById(id);
            return category;
        } catch (error) {
            console.error(`{CategoryService -> getCategoryById} Failed to retrieve category by ID '${id}' for tenant DB '${tenantDbName}':`, error);
            throw new Error("Failed to retrieve category.");
        }
    }

    /**
     * Create a new category for a specific tenant
     * @param tenantDbName - The name of the tenant's database
     * @param categoryData - Data for the new category
     */
    async createCategory(tenantDbName: string, categoryData: { name: string; slug: string; images?: string[]; description?: string }): Promise<ICategory> { // Added tenantDbName parameter
        try {
            const TenantCategory = this.getTenantCategoryModel(tenantDbName); // Use tenant-specific model
            const newCategory = new TenantCategory(categoryData); // Create instance using tenant-specific model
            await newCategory.save();
            console.log(`{CategoryService -> createCategory} Successfully created category '${newCategory.name}' for tenant DB '${tenantDbName}'`);
            return newCategory;
        } catch (error: any) { // Use 'any' for general error catching if specific type not known
            console.error(`{CategoryService -> createCategory} Failed to create category for tenant DB '${tenantDbName}':`, error);
            throw error; // Propagate the specific error for better handling in router
        }
    }

    /**
     * Get all categories for a specific tenant (duplicate of getCategories, keeping for consistency with original)
     * @param tenantDbName - The name of the tenant's database
     */
    async getAllCategories(tenantDbName: string): Promise<ICategory[]> { // Added tenantDbName parameter
        try {
            const TenantCategory = this.getTenantCategoryModel(tenantDbName); // Use tenant-specific model
            const categories = await TenantCategory.find({});
            return categories;
        } catch (error) {
            console.error(`{CategoryService -> getAllCategories} Failed to retrieve all categories for tenant DB '${tenantDbName}':`, error);
            throw new Error("{func: getAllCategories} -> Failed to retrieve all categories.");
        }
    }
}

export default new CategoryService();