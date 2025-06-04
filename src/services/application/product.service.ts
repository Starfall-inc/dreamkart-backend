import mongoose from "mongoose";
import Product, { IProduct } from "../../model/application/product.model";
import Category, { ICategory } from "../../model/application/category.model";
import { CreateProductDto, UpdateProductDto } from "../../types/product.dto"; // Adjusted path for DTOs

export class ProductService { // Changed to export class
    private tenantId: string;

    constructor(tenantId: string) {
        if (!tenantId) {
            throw new Error("Tenant ID is required for ProductService");
        }
        this.tenantId = tenantId;
    }

    private getTenantProductModel() { // Removed tenantDbName parameter
        const tenantDb = mongoose.connection.useDb(this.tenantId, { useCache: true });
        return tenantDb.model<IProduct>('Product', Product.schema);
    }

    private getTenantCategoryModel() { // Removed tenantDbName parameter
        const tenantDb = mongoose.connection.useDb(this.tenantId, { useCache: true });
        return tenantDb.model<ICategory>('Category', Category.schema);
    }

    async getAllProducts(options: { page?: number, limit?: number, sort?: string } = {}): Promise<IProduct[]> { // Removed tenantDbName, added options
        try {
            const TenantProduct = this.getTenantProductModel();
            const TenantCategory = this.getTenantCategoryModel();

            let query = TenantProduct.find({}).populate({
                path: 'category',
                model: TenantCategory
            });

            if (options.sort) {
                query = query.sort(options.sort);
            }
            if (options.page && options.limit) {
                const skip = (options.page - 1) * options.limit;
                query = query.skip(skip).limit(options.limit);
            }

            const products = await query.exec();
            return products;
        } catch (error) {
            console.error(`{ProductService -> getAllProducts} Error fetching products for tenant '${this.tenantId}':`, error);
            throw new Error('Failed to retrieve products.');
        }
    }

    async getProductBySku(sku: string): Promise<IProduct | null> { // Removed tenantDbName
        try {
            const TenantProduct = this.getTenantProductModel();
            const TenantCategory = this.getTenantCategoryModel();
            const product = await TenantProduct.findOne({ sku }).populate({
                path: 'category',
                model: TenantCategory
            }).exec();
            return product;
        } catch (error) {
            console.error(`{ProductService -> getProductBySku} Error retrieving product by SKU '${sku}' for tenant '${this.tenantId}':`, error);
            throw new Error('Failed to retrieve product by SKU.'); // Specific error message
        }
    }

    async getProductbyCategory(categoryId: string): Promise<IProduct[]> { // Removed tenantDbName
        try {
            const TenantProduct = this.getTenantProductModel();
            const TenantCategory = this.getTenantCategoryModel();
            const products = await TenantProduct.find({ category: categoryId }).populate({
                path: 'category',
                model: TenantCategory
            }).exec();
            return products;
        } catch (error) {
            console.error(`{ProductService -> getProductByCategory} Error retrieving products by category '${categoryId}' for tenant '${this.tenantId}':`, error);
            throw new Error('Failed to retrieve products by category.');
        }
    }

    async searchProducts(query: string): Promise<IProduct[]> { // Removed tenantDbName
        try {
            const TenantProduct = this.getTenantProductModel();
            const TenantCategory = this.getTenantCategoryModel();
            // A simple name search, can be expanded
            const products = await TenantProduct.find({ name: { $regex: query, $options: 'i' } }).populate({
                path: 'category',
                model: TenantCategory
            }).exec();
            return products;
        } catch (error) {
            console.error(`{ProductService -> searchProducts} Error searching products with query '${query}' for tenant '${this.tenantId}':`, error);
            throw new Error('Failed to search products.');
        }
    }

    async createProduct(productData: CreateProductDto): Promise<IProduct> { // Removed tenantDbName, used DTO
        try {
            const TenantProduct = this.getTenantProductModel();
            // Map categoryId from DTO to category field
            const productToSave = { ...productData, category: productData.categoryId } as any; // Use 'as any' for temp manipulation
            delete productToSave.categoryId; // remove categoryId as it's mapped to 'category'

            const product = new TenantProduct(productToSave);
            await product.save();
            return product;
        } catch (error: any) {
            console.error(`{ProductService -> createProduct} Failed to create product for tenant '${this.tenantId}':`, error);
            throw error;
        }
    }

    async updateProduct(sku: string, productData: UpdateProductDto): Promise<IProduct | null> { // Removed tenantDbName, used DTO
        try {
            const TenantProduct = this.getTenantProductModel();
            const TenantCategory = this.getTenantCategoryModel(); // Needed for populate if used post-update

            // If categoryId is being updated, map it to 'category'
            let updatePayload: any = productData;
            if (productData.categoryId) {
                updatePayload = { ...productData, category: productData.categoryId };
                delete updatePayload.categoryId;
            }

            const updatedProduct = await TenantProduct.findOneAndUpdate(
                { sku },
                updatePayload,
                { new: true, runValidators: true }
            ).populate({ // Populate after update
                path: 'category',
                model: TenantCategory
            }).exec();

            if (!updatedProduct) {
                 // Keep specific error for "not found"
                throw new Error("Product not found or update failed.");
            }
            return updatedProduct;
        } catch (error: any) {
            console.error(`{ProductService -> updateProduct} Failed to update product by SKU '${sku}' for tenant '${this.tenantId}':`, error);
             // If it's the specific "not found" error, rethrow it, otherwise wrap
            if (error.message === "Product not found or update failed.") {
                throw error;
            }
            throw new Error('Failed to update product.'); // General error
        }
    }

    async deleteProduct(sku: string): Promise<IProduct | null> { // Removed tenantDbName
        try {
            const TenantProduct = this.getTenantProductModel();
            const TenantCategory = this.getTenantCategoryModel(); // For population

            const deletedProduct = await TenantProduct.findOneAndDelete({ sku }).populate({
                path: 'category',
                model: TenantCategory
            }).exec();

            if (!deletedProduct) {
                throw new Error("Product not found or delete failed.");
            }
            return deletedProduct;
        } catch (error: any) {
            console.error(`{ProductService -> deleteProduct} Failed to delete product by SKU '${sku}' for tenant '${this.tenantId}':`, error);
            if (error.message === "Product not found or delete failed.") {
                throw error;
            }
            throw new Error('Failed to delete product.'); // General error
        }
    }
}

// Removed default export of new ProductService()