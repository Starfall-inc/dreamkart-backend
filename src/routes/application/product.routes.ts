import express from 'express';
import ProductService from '../../services/application/product.service';
import Tenant from '../../model/platform/tenant.model';
import tenantService from '../../services/platform/tenant.service';

const router = express.Router();



// 💖 Route to get all products for a specific tenant 💖
router.get('/', async (req, res) => { // Removed /product from path as it's defined in outer router.use('/product', productRoutes)
    const tenantDbName: string = res.locals.tenantDbName!; // Use '!' as middleware guarantees it's there
    console.log(`Fetching all products for tenant: ${tenantDbName}`);
    try {
        const products = await ProductService.getAllProducts(tenantDbName);
        res.status(200).json(products);
        console.log(`Fetched ${products.length} products for tenant ${tenantDbName}`);
    } catch (error: any) {
        console.error(`Error fetching all products for tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: 'Failed to fetch products', error: error.message });
    }
});

// 🔍 Route to get a product by SKU for a specific tenant 🔍
// @ts-ignore
router.get('/:sku', async (req, res) => { // Removed /product from path
    const tenantDbName: string = res.locals.tenantDbName;
    try {
        const product = await ProductService.getProductBySku(tenantDbName, req.params.sku); // Pass tenantDbName
        if (!product) {
            return res.status(404).json({ message: 'Product not found, darling! 🥺' });
        }
        res.status(200).json(product);
    } catch (error: any) {
        console.error(`Error fetching product by SKU (${req.params.sku}) for tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: 'Failed to fetch product', error: error.message });
    }
});

// 🔎 Route to search products by query for a specific tenant 🔎
router.get('/search/:query', async (req, res) => { // Removed /product from path
    const tenantDbName: string = res.locals.tenantDbName;
    try {
        const products = await ProductService.searchProducts(tenantDbName, req.params.query); // Pass tenantDbName
        res.status(200).json(products);
    } catch (error: any) {
        console.error(`Error searching products with query (${req.params.query}) for tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: 'Failed to search products', error: error.message });
    }
});


// ➕ Route to create a new product for a specific tenant ➕
// @ts-ignore
router.post('/', async (req, res) => { // Removed /product from path
    const tenantDbName: string = res.locals.tenantDbName;
    try {
        const newProduct = await ProductService.createProduct(tenantDbName, req.body); // Pass tenantDbName
        res.status(201).json(newProduct);
    } catch (error: any) {
        console.error(`Error creating product for tenant ${tenantDbName}:`, error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed, sweetie! Please check your inputs.', errors: error.errors });
        }
        if (error.code === 11000) { // MongoDB duplicate key error
            return res.status(409).json({ message: 'Oh dear, a product with that SKU already exists! Please use a unique one.', error: error.message });
        }
        res.status(500).json({ message: 'Failed to create product', error: error.message });
    }
});

// ✏️ Route to update a product by SKU for a specific tenant ✏️
// @ts-ignore
router.put('/:sku', async (req, res) => { // Removed /product from path
    const tenantDbName: string = res.locals.tenantDbName;
    try {
        const updatedProduct = await ProductService.updateProduct(tenantDbName, req.params.sku, req.body); // Pass tenantDbName
        res.status(200).json(updatedProduct);
    } catch (error: any) {
        console.error(`Error updating product by SKU (${req.params.sku}) for tenant ${tenantDbName}:`, error);
        if (error.message.includes('Product not found')) {
            return res.status(404).json({ message: 'Product not found to update! 🥺' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed during update, darling! Please check your inputs.', errors: error.errors });
        }
        res.status(500).json({ message: 'Failed to update product', error: error.message });
    }
});

// 🗑️ Route to delete a product by SKU for a specific tenant 🗑️
// @ts-ignore
router.delete('/:sku', async (req, res) => { // Removed /product from path
    const tenantDbName: string = res.locals.tenantDbName;
    try {
        const deletedProduct = await ProductService.deleteProduct(tenantDbName, req.params.sku); // Pass tenantDbName
        if (!deletedProduct) { // This check might be redundant if service throws error, but good for clarity
            return res.status(404).json({ message: 'Product not found to delete! 🥺' });
        }
        res.status(204).send();
    } catch (error: any) {
        console.error(`Error deleting product by SKU (${req.params.sku}) for tenant ${tenantDbName}:`, error);
        if (error.message.includes('Product not found')) { // Check for specific error message from service
            return res.status(404).json({ message: 'Product not found to delete! 🥺' });
        }
        res.status(500).json({ message: 'Failed to delete product', error: error.message });
    }
});

export default router;