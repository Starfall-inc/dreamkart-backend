import Category from "../model/category.model";

class CategoryService {

    /*
        get all the categories
    */
    async getCategories() {
        try {
            const categories = await Category.find({});
            return categories;
        } catch (error) {
            console.error("{func: getCategories} Cannot fetch categories");
            throw new Error('{func: getCategories} Failed to retrieve categories.');
        }
    }

    /*
        get a category by slug
    */
    async getCategoryBySlug(slug: string) {
        try {
            const category = await Category.findOne({ slug });
            return category;
        } catch (error) {
            console.error("{func: getCategoryBySlug} -> Failed to retrieve category.");
            throw new Error("{func: getCategoryBySlug} -> Failed to retrieve category.");
        }
    }

    /*
        get a category by id
    */
    async getCategoryById(id: string) {
        try {
            const category = await Category.findById(id);
            return category;
        } catch (error) {
            console.error("{func: getCategoryById} -> Failed to retrieve category.");
            throw new Error("{func: getCategoryById} -> Failed to retrieve category.");
        }
    }

    /* 
        create a new category
    */
    async createCategory(categoryData: { name: string; slug: string; images?: string[]; description?: string }) {
        try {
            const newCategory = new Category(categoryData);
            await newCategory.save();
            return newCategory;
        } catch (error) {
            console.error("{func: createCategory} -> Failed to create category.");
            throw new Error("{func: createCategory} -> Failed to create category.");
        }
    }

    /*
        get all categories 
    */
    async getAllCategories() {
        try {
            const categories = await Category.find({});
            return categories;
        } catch (error) {
            console.error("{func: getAllCategories} -> Failed to retrieve all categories:", error); // Added error detail for future debugging
            throw new Error("{func: getAllCategories} -> Failed to retrieve all categories.");
        }
    }
}

export default new CategoryService();