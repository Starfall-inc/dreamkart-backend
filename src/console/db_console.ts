import readline from 'readline'; // To read input from the console
import connectDB from '../config/db'; // Our database connection function
import ProductService from '../services/application/product.service'; // Our wonderful Product Service
import CategoryService from '../services/application/category.service'; // We'll need a Category Service too!
import serverConfig from '../config/server'; // Our server config for MongoDB URI
import mongoose from 'mongoose'; // To access mongoose.connection.db.name

// --- Helper for getting user input ---
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query: string): Promise<string> => {
    return new Promise(resolve => rl.question(query, resolve));
};

// --- Main Console Application Logic ---
async function startDbConsole() {
    console.log("💖 Welcome to your Database Console, darling! 💖");
    console.log("Connecting to MongoDB...");

    try {
        await connectDB(); // Connect to our database first!

        let running = true;
        while (running) {
            const prompt = `\n%SHELL% > `;
            const command = await askQuestion(prompt);
            const [cmd, ...args] = command.trim().split(' ');

            switch (cmd.toLowerCase()) {
                case 'addproduct':
                    await addProduct();
                    break;
                case 'getallproducts':
                    await getAllProducts();
                    break;
                case 'getproductbysku':
                    await getProductBySku();
                    break;
                case 'addcategory':
                    await addCategory();
                    break;
                case 'getallcategories':
                    await getAllCategories();
                    break;
                case 'getproductsbycategory':
                    await getProductsByCategory();
                    break;
                case 'exit':
                    running = false;
                    break;
                case 'help':
                    displayHelp();
                    break;
                default:
                    console.log(`Unknown command: '${cmd}'. Type 'help' for options, sweetie!`);
            }
        }
    } catch (error) {
        console.error("Oh dear, something went wrong with the console application:", error);
    } finally {
        console.log("Closing database connection. Goodbye for now! 👋");
        await mongoose.disconnect(); // Always disconnect when done!
        rl.close(); // Close the readline interface
        process.exit(0); // Exit gracefully
    }
}

// --- Console Command Implementations ---

// Example: Add a Product
async function addProduct() {
    console.log("\n--- Add New Product ---");
    try {
        const sku = await askQuestion("SKU (e.g., LAPTOP-001): ");
        const name = await askQuestion("Product Name: ");
        const priceStr = await askQuestion("Price: ");
        const imageStr = await askQuestion("Image URLs (comma-separated, optional): ");
        const description = await askQuestion("Description: ");

        // ✨ Add the category fetching logic back here, sweetie! ✨
        console.log("Fetching available categories...");
        const categories = await CategoryService.getAllCategories(); // <--- This line was missing!
        if (categories.length === 0) {
            console.log("No categories found! Please add a category first. 😥");
            return; // Stop the function if no categories are found
        }
        console.log("Available Categories:");
        categories.forEach((cat, index) => console.log(`${index + 1}. ${cat.name} (${cat._id})`));
        const categoryIndexStr = await askQuestion("Enter the number of the category: ");
        const categoryIndex = parseInt(categoryIndexStr) - 1;

        if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= categories.length) {
            console.log("Invalid category selection. Please try again. 😔");
            return; // Stop the function if the selection is invalid
        }
        // @ts-ignore // We can keep this if TypeScript complains about _id type, or use .toString()
        const categoryId = categories[categoryIndex]._id.toString();

        const newProduct = await ProductService.createProduct({
            sku,
            name,
            price: parseFloat(priceStr),
            image: imageStr ? imageStr.split(',').map(s => s.trim()) : [],
            description,
            category: categoryId,
        });
        console.log("🥳 Product added successfully:", newProduct.name);
        console.log("Product Mongoose _id:", newProduct._id);
        console.log("Product SKU:", newProduct.sku);
    } catch (error: any) {
        console.error("Failed to add product:", error.message || error);
    }
}

// Example: Get All Products
async function getAllProducts() {
    console.log("\n--- All Products ---");
    try {
        const products = await ProductService.getAllProducts();
        if (products.length === 0) {
            console.log("No products found yet, sweetie! Maybe add some? 😊");
            return;
        }
        products.forEach(p => {
            console.log(`SKU: ${p._id}, Name: ${p.name}, Price: $${p.price.toFixed(2)}`);
            console.log(`  Category: ${(p.category as any).name || p.category}`); // Show category name if populated
            console.log(`  Description: ${p.description.substring(0, 50)}...`);
            console.log('  Images: ' + (p.image.length > 0 ? p.image.join(', ') : 'No images available'));
            console.log('---');
        });
    } catch (error: any) {
        console.error("Failed to retrieve products:", error.message || error);
    }
}

// Example: Get Product by SKU
async function getProductBySku() {
    console.log("\n--- Get Product by SKU ---");
    try {
        const sku = await askQuestion("Enter Product SKU: ");
        const product = await ProductService.getProdutBySku(sku); // Note: It's `getProdutBySku` in your service!
        if (product) {
            console.log("Found Product! 🎉");
            console.log(`SKU: ${product._id}`);
            console.log(`Name: ${product.name}`);
            console.log(`Price: $${product.price.toFixed(2)}`);
            console.log(`Category: ${(product.category as any).name || product.category}`);
            console.log(`Description: ${product.description}`);
        } else {
            console.log(`Product with SKU '${sku}' not found. 😔`);
        }
    } catch (error: any) {
        console.error("Failed to retrieve product by SKU:", error.message || error);
    }
}

// Example: Add a Category
async function addCategory() {
    console.log("\n--- Add New Category ---");
    try {
        const name = await askQuestion("Category Name: ");
        const slug = await askQuestion("Category Slug (e.g., electronics): ");
        const imageStr = await askQuestion("Image URLs (comma-separated, optional): ");
        const description = await askQuestion("Description: ");

        const newCategory = await CategoryService.createCategory({
            name,
            slug,
            images: imageStr ? imageStr.split(',').map(s => s.trim()) : [],
            description,
        });
        console.log("🥳 Category added successfully:", newCategory.name);
    } catch (error: any) {
        console.error("Failed to add category:", error.message || error);
    }
}

// Example: Get All Categories
async function getAllCategories() {
    console.log("\n--- All Categories ---");
    try {
        const categories = await CategoryService.getAllCategories();
        if (categories.length === 0) {
            console.log("No categories found yet. Let's add some! 😊");
            return;
        }
        categories.forEach(c => {
            console.log(`Name: ${c.name}, Slug: ${c.slug}, ID: ${c._id}`);
            console.log(`  Description: ${c.description.substring(0, 50)}...`);
            console.log('---');
        });
    } catch (error: any) {
        console.error("Failed to retrieve categories:", error.message || error);
    }
}

// Example: Get Products by Category
async function getProductsByCategory() {
    console.log("\n--- Get Products by Category ---");
    try {
        const categories = await CategoryService.getAllCategories();
        if (categories.length === 0) {
            console.log("No categories to search by! Please add a category first. 😥");
            return;
        }
        console.log("Available Categories:");
        categories.forEach((cat, index) => console.log(`${index + 1}. ${cat.name} (${cat._id})`));
        const categoryIndexStr = await askQuestion("Enter the number of the category to search for: ");
        const categoryIndex = parseInt(categoryIndexStr) - 1;

        if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= categories.length) {
            console.log("Invalid category selection. Please try again. 😔");
            return;
        }

        // @ts-ignore
        const categoryId : string = categories[categoryIndex]._id;

        console.log(`Searching for products in category: ${categories[categoryIndex].name}...`);
        const products = await ProductService.getProductbyCategory(categoryId);
        if (products.length === 0) {
            console.log(`No products found in category '${categories[categoryIndex].name}'. 🥺`);
            return;
        }
        products.forEach(p => {
            console.log(`SKU: ${p._id}, Name: ${p.name}, Price: $${p.price.toFixed(2)}`);
            console.log(`  Description: ${p.description.substring(0, 50)}...`);
            console.log('---');
        });

    } catch (error: any) {
        console.error("Failed to retrieve products by category:", error.message || error);
    }
}


// --- Help Display ---
function displayHelp() {
    console.log("\n--- Available Commands, Sweetie! ---");
    console.log("  💖 addproduct        - Add a new product to the database.");
    console.log("  💖 getallproducts    - List all products.");
    console.log("  💖 getproductbysku   - Find a product by its SKU.");
    console.log("  💖 addcategory       - Add a new product category.");
    console.log("  💖 getallcategories  - List all categories.");
    console.log("  💖 getproductsbycategory - Find products belonging to a specific category.");
    console.log("  💖 help              - Show this help message.");
    console.log("  💖 exit              - Close the console application.");
    console.log("-----------------------------------\n");
}

// Start our console application!
startDbConsole();