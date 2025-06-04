import mongoose from 'mongoose';
import CategoryService from '@src/services/application/category.service';
import { ICategory } from '@src/model/application/category.model'; // Only for type
import * as TenantDbConnection from '@src/connection/tenantDb';
import CategoryModelSchema from '@src/model/application/category.model'; // Import the actual model for schema access

// Mock the getTenantDb utility
jest.mock('@src/connection/tenantDb');

describe('CategoryService (Application Level)', () => {
  let mockGetTenantDb: jest.Mock;
  let mockTenantDbInstance: any;

  let mockCategoryModel: any; // This will be our mocked Mongoose model for Category
  let mockCategorySave: jest.Mock;
  let mockCategoryFind: jest.Mock;
  let mockCategoryFindById: jest.Mock;
  let mockCategoryFindByIdAndUpdate: jest.Mock;
  let mockCategoryFindByIdAndDelete: jest.Mock;
  let mockCategoryFindOne: jest.Mock;
  let mockCategoryFindOneAndUpdate: jest.Mock; // Added
  let mockCategoryFindOneAndDelete: jest.Mock; // Added

  const tenantDbName = 'test_tenant_db_for_category_service';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock functions for the Category model methods
    mockCategorySave = jest.fn();
    mockCategoryFind = jest.fn();
    mockCategoryFindById = jest.fn();
    mockCategoryFindByIdAndUpdate = jest.fn(); // For findByIdAndUpdate
    mockCategoryFindByIdAndDelete = jest.fn(); // For findByIdAndDelete
    mockCategoryFindOne = jest.fn();
    mockCategoryFindOneAndUpdate = jest.fn(); // For findOneAndUpdate
    mockCategoryFindOneAndDelete = jest.fn(); // For findOneAndDelete

    // Mock CategoryModel constructor
    mockCategoryModel = jest.fn().mockImplementation((data?: any) => {
      // This instance is what `new CategoryModel(data)` returns
      return {
        ...data,
        _id: data?._id || new mongoose.Types.ObjectId(),
        save: mockCategorySave, // Its save method is our shared mockCategorySave
      };
    });

    // Attach static methods to the mock constructor
    mockCategoryModel.find = mockCategoryFind;
    mockCategoryModel.findById = mockCategoryFindById;
    mockCategoryModel.findByIdAndUpdate = mockCategoryFindByIdAndUpdate; // Service might not use this directly
    mockCategoryModel.findByIdAndDelete = mockCategoryFindByIdAndDelete; // Service might not use this directly
    mockCategoryModel.findOne = mockCategoryFindOne;
    mockCategoryModel.findOneAndUpdate = mockCategoryFindOneAndUpdate; // Used by service's updateCategory
    mockCategoryModel.findOneAndDelete = mockCategoryFindOneAndDelete; // Used by service's deleteCategory
    mockCategoryModel.schema = CategoryModelSchema.schema;

    // Default behavior for save, can be overridden in tests
    mockCategorySave.mockResolvedValue({ _id: new mongoose.Types.ObjectId(), name: 'Default Saved' });

    mockTenantDbInstance = {
      model: jest.fn().mockImplementation((modelName: string) => {
        if (modelName === 'Category') {
          return mockCategoryModel;
        }
        const GenericMockModel = jest.fn((data?: any) => ({ ...data, save: jest.fn().mockResolvedValue(data) }));
        GenericMockModel.find = jest.fn().mockResolvedValue([]);
        // ... add all static mocks for GenericMockModel if it's ever used
        GenericMockModel.schema = new mongoose.Schema({});
        return GenericMockModel;
      }),
    };

    mockGetTenantDb = TenantDbConnection.getTenantDb as jest.Mock;
    mockGetTenantDb.mockReturnValue(mockTenantDbInstance);
  });

  // CategoryService is imported as an instance (singleton)
  const categoryService = CategoryService;

  describe('createCategory', () => {
    it('should create a category successfully', async () => {
      const categoryData = { name: 'Electronics', description: 'Gadgets and devices' };
      const instanceId = new mongoose.Types.ObjectId();

      // This is the object that `new CategoryModel(data)` will be, which is also returned by the service
      const mockInstanceReturnedByConstructor = {
        ...categoryData,
        _id: instanceId,
        save: mockCategorySave // save is the mock function
      };

      (mockCategoryModel as jest.Mock).mockReturnValue(mockInstanceReturnedByConstructor);
      // Assume instance.save() resolves to the instance itself (common Mongoose pattern after save)
      mockCategorySave.mockResolvedValue(mockInstanceReturnedByConstructor);

      const result = await categoryService.createCategory(tenantDbName, categoryData);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('Category', CategoryModelSchema.schema);
      expect(mockCategoryModel).toHaveBeenCalledWith(categoryData);
      expect(mockCategorySave).toHaveBeenCalledTimes(1); // instance.save() was called

      // Check properties of the returned instance
      expect(result._id).toEqual(instanceId);
      expect(result.name).toBe(categoryData.name);
      expect(result.description).toBe(categoryData.description);
      // Verify that the returned object is indeed the one from the constructor, which includes the save mock
      expect(result).toBe(mockInstanceReturnedByConstructor);
    });

    it('should throw an error if category creation fails', async () => {
      const categoryData = { name: 'Test', description: 'Test Desc' };
      const saveError = new Error('Failed to save category');
      // Ensure this specific call to save (via the instance created in createCategory) rejects
      mockCategorySave.mockRejectedValue(saveError);

      await expect(categoryService.createCategory(tenantDbName, categoryData))
        .rejects.toThrow(saveError);
    });
  });

  describe('getCategories', () => {
    it('should return a list of categories', async () => {
      const categories = [{ name: 'Books', _id: new mongoose.Types.ObjectId() }, { name: 'Music', _id: new mongoose.Types.ObjectId() }];
      mockCategoryFind.mockResolvedValue(categories);

      const result = await categoryService.getCategories(tenantDbName);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('Category', CategoryModelSchema.schema);
      expect(mockCategoryFind).toHaveBeenCalledWith({}); // Assuming no filter passed
      expect(result).toEqual(categories);
    });
  });

  describe('getCategoryById', () => {
    it('should return a category if found', async () => {
      const categoryId = new mongoose.Types.ObjectId().toString();
      const category = { _id: categoryId, name: 'Movies' };
      mockCategoryFindById.mockResolvedValue(category);

      const result = await categoryService.getCategoryById(tenantDbName, categoryId);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('Category', CategoryModelSchema.schema);
      expect(mockCategoryFindById).toHaveBeenCalledWith(categoryId);
      expect(result).toEqual(category);
    });

     // This test assumes the service is modified to throw an error if category is not found.
     // If service returns null, this test should be expect(result).toBeNull();
     it('should throw an error if category not found by ID', async () => {
      const categoryId = new mongoose.Types.ObjectId().toString();
      mockCategoryFindById.mockResolvedValue(null); // Simulate findById not finding anything

      // Assuming CategoryService.getCategoryById is updated to throw this error:
      await expect(categoryService.getCategoryById(tenantDbName, categoryId))
          .rejects.toThrow(`Category with id ${categoryId} not found in ${tenantDbName}`);
    });
  });

  describe('updateCategory', () => {
    it('should update a category successfully', async () => {
      const categorySlug = 'movies-slug';
      const updateData = { description: 'All kinds of movies, updated' };
      const updatedCategory = { _id: new mongoose.Types.ObjectId(), name: 'Movies', slug: categorySlug, ...updateData };
      mockCategoryFindOneAndUpdate.mockResolvedValue(updatedCategory);

      const result = await categoryService.updateCategory(tenantDbName, categorySlug, updateData);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('Category', CategoryModelSchema.schema);
      expect(mockCategoryFindOneAndUpdate).toHaveBeenCalledWith({ slug: categorySlug }, { $set: updateData }, { new: true, runValidators: true });
      expect(result).toEqual(updatedCategory);
    });

    it('should throw an error if category to update is not found', async () => {
      const categorySlug = 'nonexistent-slug';
      const updateData = { description: 'A new description' };
      mockCategoryFindOneAndUpdate.mockResolvedValue(null); // Simulate category not found

      // The service currently returns null if not found, and logs a warning.
      // For consistency with other "not found" cases that throw, this test assumes the service *should* throw.
      // If the service is intended to return null, this test needs to change.
      await expect(categoryService.updateCategory(tenantDbName, categorySlug, updateData))
          .rejects.toThrow(`Category with slug '${categorySlug}' not found for update in ${tenantDbName}`);
      // If service returns null instead of throwing:
      // const result = await categoryService.updateCategory(tenantDbName, categorySlug, updateData);
      // expect(result).toBeNull();
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category successfully', async () => {
      const categorySlug = 'oldies-slug';
      const deletedCategory = { _id: new mongoose.Types.ObjectId(), name: 'Oldies', slug: categorySlug };
      mockCategoryFindOneAndDelete.mockResolvedValue(deletedCategory);

      const result = await categoryService.deleteCategory(tenantDbName, categorySlug);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('Category', CategoryModelSchema.schema);
      expect(mockCategoryFindOneAndDelete).toHaveBeenCalledWith({ slug: categorySlug });
      expect(result).toEqual(deletedCategory);
    });

    it('should throw an error if category to delete is not found', async () => {
      const categorySlug = 'nonexistent-slug';
      mockCategoryFindOneAndDelete.mockResolvedValue(null); // Simulate category not found

      // Similar to update, the service currently returns null.
      // This test assumes the service should throw for consistency.
      await expect(categoryService.deleteCategory(tenantDbName, categorySlug))
        .rejects.toThrow(`Category with slug '${categorySlug}' not found for deletion in ${tenantDbName}`);
      // If service returns null:
      // const result = await categoryService.deleteCategory(tenantDbName, categorySlug);
      // expect(result).toBeNull();
    });
  });
});
