import mongoose from "mongoose"; // Don't forget to import mongoose!
import Category, { ICategory } from "../../model/application/category.model";
import { getTenantDb } from "../../connection/tenantDb";

class CategoryService {

    // Helper method to get the correct Category model for a given tenant
    // This is the core multi-tenancy piece for models! 🔑
    private getTenantCategoryModel(tenantDbName: string) {
        const tenantDb : mongoose.Connection = getTenantDb(tenantDbName)
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

    // This was a duplicate of getCategories, keeping it for now but you might want to remove it later if not needed!
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

    /**
     * Update an existing category for a specific tenant by slug.
     * @param tenantDbName - The name of the tenant's database.
     * @param slug - The slug of the category to update.
     * @param updateData - The data to update the category with.
     */
    async updateCategory(tenantDbName: string, slug: string, updateData: Partial<ICategory>): Promise<ICategory | null> {
        try {
            const TenantCategory = this.getTenantCategoryModel(tenantDbName);
            // Use findOneAndUpdate for atomic update and to return the updated document
            const updatedCategory = await TenantCategory.findOneAndUpdate(
                { slug },
                { $set: updateData }, // $set ensures only specified fields are updated
                { new: true, runValidators: true } // new: true returns the updated doc; runValidators: true validates updates
            );
            if (updatedCategory) {
                console.log(`{CategoryService -> updateCategory} Successfully updated category '${slug}' for tenant DB '${tenantDbName}'`);
            } else {
                console.warn(`{CategoryService -> updateCategory} Category with slug '${slug}' not found for update in tenant DB '${tenantDbName}'`);
            }
            return updatedCategory;
        } catch (error: any) {
            console.error(`{CategoryService -> updateCategory} Failed to update category '${slug}' for tenant DB '${tenantDbName}':`, error);
            throw error; // Propagate the specific error for better handling in router
        }
    }

    /**
     * Delete a category for a specific tenant by slug.
     * @param tenantDbName - The name of the tenant's database.
     * @param slug - The slug of the category to delete.
     */
    async deleteCategory(tenantDbName: string, slug: string): Promise<ICategory | null> {
        try {
            const TenantCategory = this.getTenantCategoryModel(tenantDbName);
            const deletedCategory = await TenantCategory.findOneAndDelete({ slug });
            if (deletedCategory) {
                console.log(`{CategoryService -> deleteCategory} Successfully deleted category '${slug}' from tenant DB '${tenantDbName}'`);
            } else {
                console.warn(`{CategoryService -> deleteCategory} Category with slug '${slug}' not found for deletion in tenant DB '${tenantDbName}'`);
            }
            return deletedCategory;
        } catch (error: any) {
            console.error(`{CategoryService -> deleteCategory} Failed to delete category '${slug}' for tenant DB '${tenantDbName}':`, error);
            throw error; // Propagate the specific error
        }
    }
}

export default new CategoryService();