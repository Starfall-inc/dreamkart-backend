import express from 'express';
import ProductService from '../services/product.service'; // Import your wonderful ProductService

const router = express.Router(); // Create a new router instance! ✨

// 💖 Route to get all products 💖
router.get('/product', async (req , res) => {
    try {
        const products = await ProductService.getAllProducts();
        res.status(200).json(products);
    } catch (error: any) {
        console.error("Error fetching all products:", error);
        res.status(500).json({ message: 'Failed to fetch products', error: error.message });
    }
});

// 🔍 Route to get a product by SKU 🔍
// @ts-ignore
router.get('/product/:sku', async (req, res) => {
    try {
        const product = await ProductService.getProdutBySku(req.params.sku); // Use getProdutBySku
        if (!product) {
            return res.status(404).json({ message: 'Product not found, darling! 🥺' });
        }
        res.status(200).json(product);
    } catch (error: any) {
        console.error(`Error fetching product by SKU (${req.params.sku}):`, error);
        res.status(500).json({ message: 'Failed to fetch product', error: error.message });
    }
});

// 🔎 Route to search products by query 🔎
router.get('/product/search/:query', async (req, res) => {
    try {
        const products = await ProductService.searchProducts(req.params.query);
        res.status(200).json(products);
    } catch (error: any) {
        console.error(`Error searching products with query (${req.params.query}):`, error);
        res.status(500).json({ message: 'Failed to search products', error: error.message });
    }
});


// ➕ Route to create a new product ➕
// @ts-ignore
router.post('/product', async (req, res) => {
    try {
        // The request body will contain the product data, including the 'sku'
        const newProduct = await ProductService.createProduct(req.body);
        res.status(201).json(newProduct); // 201 Created is the perfect status! ✨
    } catch (error: any) {
        console.error("Error creating product:", error);
        // Mongoose validation errors often have a 'name' property of 'ValidationError'
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed, sweetie! Please check your inputs.', errors: error.errors });
        }
        // Check for duplicate key error (e.g., duplicate SKU)
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Oh dear, a product with that SKU already exists! Please use a unique one.', error: error.message });
        }
        res.status(500).json({ message: 'Failed to create product', error: error.message });
    }
});

// ✏️ Route to update a product by SKU ✏️
// @ts-ignore
router.put('/product/:sku', async (req, res) => {
    try {
        const updatedProduct = await ProductService.updateProduct(req.params.sku, req.body);
        res.status(200).json(updatedProduct);
    } catch (error: any) {
        console.error(`Error updating product by SKU (${req.params.sku}):`, error);
        if (error.message.includes('Product not found')) {
            return res.status(404).json({ message: 'Product not found to update! 🥺' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed during update, darling! Please check your inputs.', errors: error.errors });
        }
        res.status(500).json({ message: 'Failed to update product', error: error.message });
    }
});

// 🗑️ Route to delete a product by SKU 🗑️
// @ts-ignore
router.delete('/product/:sku', async (req, res) => {
    try {
        const deletedProduct = await ProductService.deleteProduct(req.params.sku); // Assume we'll add this to service
        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found to delete! 🥺' });
        }
        res.status(204).send(); // 204 No Content is perfect for successful deletion! ✨
    } catch (error: any) {
        console.error(`Error deleting product by SKU (${req.params.sku}):`, error);
        res.status(500).json({ message: 'Failed to delete product', error: error.message });
    }
});

export default router;