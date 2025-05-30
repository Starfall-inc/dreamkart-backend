import Product from "../model/product.model";

class ProductService{

    /*
        get all the products
    */
    async getAllProducts() {
        try{
            const products = await Product.find({}).populate('category');
            return products;
        } catch (error){
            console.error("{func: getProducts} Cannot fetch products");
            throw new Error('{func: getProducts} Failed to retrieve products.'); 
        }
    }

    /*
        get a product by SKU
    */
    async getProdutBySku(sku: string){

        try {
            const products = await Product.findOne({ sku });
            return products;
        } catch (error) {
            console.error("{func: getProductbySku} -> Failed to retrieve products.");
            throw new Error("{func: getProductbySku} -> Failed to retrieve products."); 
        }

    }

    /*
     * get product by category
     */
    async getProductbyCategory(category: string) { // It's a string, the category's _id!
        try {
            const products = await Product.find({ category: category }).populate('category'); // Find products where category field matches
            return products;
        } catch (error) {
            console.error("{func: getProductByCategory} -> Failed to retrieve products by category.");
            throw new Error("{func: getProductByCategory} -> Failed to retrieve products by category.");
        }
    }

    /*
        search products by query
        This function searches for products based on a query string.
        It looks for matches in the product's name, description, and attributes.
        The search is case-insensitive and uses regular expressions to find partial matches.
        @param {string} query - The search query string.
        @returns {Promise<Product[]>} - A promise that resolves to an array of products matching the search criteria.
        @throws {Error} - Throws an error if the search fails.  
    */
    async searchProducts(query: string) {
        try {
            const products = await Product.find({
                $or: [
                    { name: { $regex: query, $options: 'i' } }, // Case-insensitive search in name
                    { description: { $regex: query, $options: 'i' } }, // Case-insensitive search in description
                    { attributes: { $regex: query, $options: 'i' } } // Case-insensitive search in attributes
                ]
            }).populate('category');
            return products;
        } catch (error) {
            console.error("{func: searchProducts} -> Failed to search products.");
            throw new Error("{func: searchProducts} -> Failed to search products.");
        }
    }

    /*
        create a new product
        This function creates a new product in the database.
        It expects a productData object containing the necessary fields.
        @param {Object}
        productData - The data for the new product.
        @returns {Promise<Product>} - A promise that resolves to the created product.
        @throws {Error} - Throws an error if the product creation fails.
    */
    async createProduct(productData: any) {
        try {
            const product = new Product(productData);
            await product.save();
            return product;
        } catch (error) {
            console.error("{func: createProduct} -> Failed to create product." + error);
            throw new Error("{func: createProduct} -> Failed to create product." + error);
        }
    }

    /*
        update a product by SKU
        This function updates an existing product in the database.
        It expects a SKU to identify the product and a productData object containing the fields to update.
        @param {string} sku - The SKU of the product to update.
        @param {Object} productData - The data to update the product with.
        @returns {Promise<Product>} - A promise that resolves to the updated product.
        @throws {Error} - Throws an error if the product update fails or if the product is not found.
    */
    async updateProduct(sku: string, productData: any) {
        try {
            const product = await Product.findOneAndUpdate(
                { sku },
                productData,
                { new: true, runValidators: true } // Return the updated document and validate
            );
            if (!product) {
                throw new Error("{func: updateProduct} -> Product not found.");
            }
            return product;
        } catch (error) {
            console.error("{func: updateProduct} -> Failed to update product.");
            throw new Error("{func: updateProduct} -> Failed to update product.");
        }
    }  

    async deleteProduct(sku: string) {
        try {
            const product = await Product.findOneAndDelete({ sku });
            if (!product) {
                throw new Error("{func: deleteProduct} -> Product not found.");
            }
            return product;
        } catch (error) {
            console.error("{func: deleteProduct} -> Failed to delete product.");
            throw new Error("{func: deleteProduct} -> Failed to delete product.");
        }
    }
}


export default new ProductService();