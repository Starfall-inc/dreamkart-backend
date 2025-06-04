import mongoose from "mongoose";
import Category, { ICategory } from "../../model/application/category.model";
import { CreateCategoryDto } from "../../dto/category.dto"; // Import DTO

export class CategoryService { // Changed to export class
    private tenantId: string;

    constructor(tenantId: string) {
        this.tenantId = tenantId;
        if (!tenantId) {
            throw new Error("Tenant ID is required to initialize CategoryService.");
        }
    }

    private getTenantCategoryModel() { // Removed tenantDbName parameter
        const tenantDb = mongoose.connection.useDb(this.tenantId, { useCache: true });
        console.log(`{CategoryService -> getTenantCategoryModel} Using tenant DB: ${this.tenantId}`);
        return tenantDb.model<ICategory>('Category', Category.schema);
    }

    async getCategories(): Promise<ICategory[]> { // Removed tenantDbName parameter
        try {
            const TenantCategory = this.getTenantCategoryModel();
            // Retrieve categories where parentId is null (top-level categories)
            const categories = await TenantCategory.find({ parentId: null });
            return categories;
        } catch (error) {
            console.error(`{CategoryService -> getCategories} Cannot fetch categories for tenant DB '${this.tenantId}':`, error);
            throw new Error('Failed to retrieve categories.');
        }
    }

    async getCategoryBySlug(slug: string): Promise<ICategory | null> { // Removed tenantDbName parameter
        try {
            const TenantCategory = this.getTenantCategoryModel();
            const category = await TenantCategory.findOne({ slug });
            return category;
        } catch (error) {
            console.error(`{CategoryService -> getCategoryBySlug} Failed to retrieve category by slug '${slug}' for tenant DB '${this.tenantId}':`, error);
            throw new Error("Failed to retrieve category.");
        }
    }

    async getCategoryById(id: string): Promise<ICategory | null> { // Removed tenantDbName parameter
        try {
            const TenantCategory = this.getTenantCategoryModel();
            const category = await TenantCategory.findById(id);
            return category;
        } catch (error) {
            console.error(`{CategoryService -> getCategoryById} Failed to retrieve category by ID '${id}' for tenant DB '${this.tenantId}':`, error);
            throw new Error("Failed to retrieve category.");
        }
    }

    async createCategory(categoryData: CreateCategoryDto): Promise<ICategory> { // Removed tenantDbName, updated type to DTO
        try {
            const TenantCategory = this.getTenantCategoryModel();
            const newCategory = new TenantCategory(categoryData);
            await newCategory.save();
            console.log(`{CategoryService -> createCategory} Successfully created category '${newCategory.name}' for tenant DB '${this.tenantId}'`);
            return newCategory;
        } catch (error: any) {
            console.error(`{CategoryService -> createCategory} Failed to create category for tenant DB '${this.tenantId}':`, error);
            throw error;
        }
    }

    async getAllCategories(): Promise<ICategory[]> { // Removed tenantDbName parameter
        try {
            const TenantCategory = this.getTenantCategoryModel();
            const categories = await TenantCategory.find({}); // Get all categories, regardless of parentId
            return categories;
        } catch (error) {
            console.error(`{CategoryService -> getAllCategories} Failed to retrieve all categories for tenant DB '${this.tenantId}':`, error);
            throw new Error("{func: getAllCategories} -> Failed to retrieve all categories.");
        }
    }
}
// Removed default export of instance