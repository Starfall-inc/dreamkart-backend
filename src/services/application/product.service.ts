import mongoose from "mongoose"; // Important for multi-tenancy!
import Product, { IProduct } from "../../model/application/product.model"; // Your base Product model
import Category, { ICategory } from "../../model/application/category.model"; // Your base Category model
import { getTenantDb } from "../../connection/tenantDb"; // Function to get tenant-specific DB connection

class ProductService {

    // Helper method to get the correct Product model for a given tenant
    // This is the core multi-tenancy piece! 🔑
    private getTenantProductModel(tenantDbName: string) {
        // Use the existing mongoose connection (to your platform DB) to switch to the tenant's DB
        const tenantDb : mongoose.Connection = getTenantDb(tenantDbName)
        // Return the Mongoose Model specific to this tenant's database
        // We ensure the schema is applied to this specific database connection
        // Mongoose automatically ensures the model is not re-registered if it already exists for this connection.
        return tenantDb.model<IProduct>('Product', Product.schema);
    }

    // Helper method to get the correct Category model for a given tenant
    private getTenantCategoryModel(tenantDbName: string) {
        const tenantDb = mongoose.connection.useDb(tenantDbName, { useCache: true });
        return tenantDb.model<ICategory>('Category', Category.schema);
    }


    /**
     * Get all products for a specific tenant
     * @param tenantDbName - The name of the tenant's database
     */
    async getAllProducts(tenantDbName: string): Promise<IProduct[]> {
        try {
            const TenantProduct = this.getTenantProductModel(tenantDbName);
            // Populate the category, but use the Category model from the same tenant DB
            const TenantCategory = this.getTenantCategoryModel(tenantDbName); 

            const products = await TenantProduct.find({}).populate({
                path: 'category',
                model: TenantCategory // Crucially populate from the tenant's Category model
            });
            return products;
        } catch (error) {
            console.error(`{ProductService -> getAllProducts} Error fetching products for tenant DB '${tenantDbName}':`, error);
            throw new Error('Failed to retrieve products.');
        }
    }

    /**
     * Get a product by SKU for a specific tenant
     * @param tenantDbName - The name of the tenant's database
     * @param sku - The SKU of the product
     */
    async getProductBySku(tenantDbName: string, sku: string): Promise<IProduct | null> { // Corrected func name
        try {
            const TenantProduct = this.getTenantProductModel(tenantDbName);
            const TenantCategory = this.getTenantCategoryModel(tenantDbName); 

            const product = await TenantProduct.findOne({ sku }).populate({
                path: 'category',
                model: TenantCategory
            });
            return product;
        } catch (error) {
            console.error(`{ProductService -> getProductBySku} Error retrieving product by SKU '${sku}' for tenant DB '${tenantDbName}':`, error);
            throw new Error("Failed to retrieve product.");
        }
    }

    /*
     * get product by category for a specific tenant
     * @param tenantDbName - The name of the tenant's database
     * @param categoryId - The _id of the category
     */
    async getProductbyCategory(tenantDbName: string, categoryId: string): Promise<IProduct[]> {
        try {
            const TenantProduct = this.getTenantProductModel(tenantDbName);
            const TenantCategory = this.getTenantCategoryModel(tenantDbName); 

            const products = await TenantProduct.find({ category: categoryId }).populate({
                path: 'category',
                model: TenantCategory
            });
            return products;
        } catch (error) {
            console.error(`{ProductService -> getProductByCategory} Error retrieving products by category '${categoryId}' for tenant DB '${tenantDbName}':`, error);
            throw new Error("Failed to retrieve products by category.");
        }
    }

    /**
     * Search products by query for a specific tenant
     * @param tenantDbName - The name of the tenant's database
     * @param query - The search query string
     */
    async searchProducts(tenantDbName: string, query: string): Promise<IProduct[]> {
        try {
            const TenantProduct = this.getTenantProductModel(tenantDbName);
            const TenantCategory = this.getTenantCategoryModel(tenantDbName); 

            const products = await TenantProduct.find({
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                    // Searching 'attributes' as a whole object might be less efficient for complex objects
                    // Consider creating a specific text index if `attributes` contains long text
                    { 'attributes.color': { $regex: query, $options: 'i' } }, // Example for specific attribute
                    { 'attributes.size': { $regex: query, $options: 'i' } } // Example for specific attribute
                ]
            }).populate({
                path: 'category',
                model: TenantCategory
            });
            return products;
        } catch (error) {
            console.error(`{ProductService -> searchProducts} Error searching products with query '${query}' for tenant DB '${tenantDbName}':`, error);
            throw new Error("Failed to search products.");
        }
    }

    /**
     * Create a new product for a specific tenant
     * @param tenantDbName - The name of the tenant's database
     * @param productData - The data for the new product
     */
    async createProduct(tenantDbName: string, productData: Partial<IProduct>): Promise<IProduct> { // Use Partial<IProduct> for request body
        try {
            const TenantProduct = this.getTenantProductModel(tenantDbName);
            const product = new TenantProduct(productData); // Create instance using tenant-specific model
            await product.save();
            return product;
        } catch (error: any) { // Use 'any' for general error catching if specific type not known
            console.error(`{ProductService -> createProduct} Failed to create product for tenant DB '${tenantDbName}':`, error);
            // Propagate specific Mongoose errors like ValidationError or duplicate key
            throw error;
        }
    }

    /**
     * Update a product by SKU for a specific tenant
     * @param tenantDbName - The name of the tenant's database
     * @param sku - The SKU of the product to update
     * @param productData - The data to update the product with
     */
    async updateProduct(tenantDbName: string, sku: string, productData: Partial<IProduct>): Promise<IProduct | null> {
        try {
            const TenantProduct = this.getTenantProductModel(tenantDbName);
            const updatedProduct = await TenantProduct.findOneAndUpdate(
                { sku },
                productData,
                { new: true, runValidators: true }
            );
            if (!updatedProduct) {
                // Throw an error if product not found to allow router to catch it
                throw new Error("Product not found for update.");
            }
            return updatedProduct;
        } catch (error: any) {
            console.error(`{ProductService -> updateProduct} Failed to update product by SKU '${sku}' for tenant DB '${tenantDbName}':`, error);
            throw error; // Propagate the specific error for better handling in router
        }
    }

    /**
     * Delete a product by SKU for a specific tenant
     * @param tenantDbName - The name of the tenant's database
     * @param sku - The SKU of the product to delete
     */
    async deleteProduct(tenantDbName: string, sku: string): Promise<IProduct | null> {
        try {
            const TenantProduct = this.getTenantProductModel(tenantDbName);
            const deletedProduct = await TenantProduct.findOneAndDelete({ sku });
            if (!deletedProduct) {
                // Throw an error if product not found for better router handling
                throw new Error("Product not found for deletion.");
            }
            return deletedProduct;
        } catch (error: any) {
            console.error(`{ProductService -> deleteProduct} Failed to delete product by SKU '${sku}' for tenant DB '${tenantDbName}':`, error);
            throw error; // Propagate the specific error for better handling in router
        }
    }
}

export default new ProductService();