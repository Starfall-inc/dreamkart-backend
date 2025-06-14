import mongoose from 'mongoose';
import ProductService from '@src/services/application/product.service';
import CategoryService from '@src/services/application/category.service'; // Assuming CategoryService is used for category validation
import { IProduct } from '@src/model/application/product.model'; // For type
import ProductModelSchema from '@src/model/application/product.model'; // Import the actual model for schema access
import * as TenantDbConnection from '@src/connection/tenantDb';

// Mock utilities and services
jest.mock('@src/connection/tenantDb');
jest.mock('@src/services/application/category.service'); // Mock CategoryService

describe('ProductService (Application Level)', () => {
  let mockGetTenantDb: jest.Mock;
  let mockTenantDbInstance: any;

  // Mocks for ProductModel
  let mockProductModel: any;
  let mockProductSave: jest.Mock;
  let mockProductFind: jest.Mock;
  let mockProductFindById: jest.Mock;
  let mockProductFindOneAndUpdate: jest.Mock;
  let mockProductFindByIdAndDelete: jest.Mock;

  // Mocks for CategoryService
  let mockCategoryServiceInstance: jest.Mocked<CategoryService>;

  const tenantDbName = 'test_tenant_db_for_product_service';
  const productObjectId = new mongoose.Types.ObjectId();
  const categoryObjectId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock functions for ProductModel methods
    mockProductSave = jest.fn();
    mockProductFind = jest.fn();
    mockProductFindById = jest.fn();
    mockProductFindOneAndUpdate = jest.fn();
    mockProductFindByIdAndDelete = jest.fn();

    // Mock ProductModel constructor
    mockProductModel = jest.fn().mockImplementation((data?: any) => ({
      ...data,
      _id: data?._id || new mongoose.Types.ObjectId(),
      save: mockProductSave,
    }));

    // Attach static methods to the mock ProductModel constructor
    mockProductModel.find = mockProductFind;
    mockProductModel.findById = mockProductFindById;
    mockProductModel.findOneAndUpdate = mockProductFindOneAndUpdate;
    mockProductModel.findByIdAndDelete = mockProductFindByIdAndDelete;
    mockProductModel.schema = ProductModelSchema.schema;

    // Mock CategoryService
    // Assuming CategoryService is a singleton instance, similar to how other services are structured.
    mockCategoryServiceInstance = CategoryService as jest.Mocked<CategoryService>;
    // Mock specific methods of CategoryService that ProductService might use
    // e.g., getCategoryById for validating category existence
    mockCategoryServiceInstance.getCategoryById = jest.fn();


    // Default behavior for save, can be overridden in tests
    mockProductSave.mockResolvedValue({ _id: productObjectId, name: 'Default Saved Product' });
    // Default behavior for CategoryService.getCategoryById
    mockCategoryServiceInstance.getCategoryById.mockResolvedValue({ _id: categoryObjectId, name: 'Mock Category', slug: 'mock-category' } as any);


    mockTenantDbInstance = {
      model: jest.fn().mockImplementation((modelName: string) => {
        if (modelName === 'Product') {
          return mockProductModel;
        }
        const GenericMockModel = jest.fn((data?: any) => ({ ...data, save: jest.fn().mockResolvedValue(data) }));
        GenericMockModel.find = jest.fn().mockResolvedValue([]);
        GenericMockModel.findById = jest.fn().mockResolvedValue(null);
        GenericMockModel.schema = new mongoose.Schema({});
        return GenericMockModel;
      }),
    };

    mockGetTenantDb = TenantDbConnection.getTenantDb as jest.Mock;
    mockGetTenantDb.mockReturnValue(mockTenantDbInstance);
  });

  // ProductService is imported as an instance (singleton)
  const productService = ProductService;

  describe('createProduct', () => {
    const productData: Partial<IProduct> = {
      name: 'Awesome Laptop',
      description: 'A very powerful laptop',
      price: 1200,
      categoryId: categoryObjectId.toString(),
      stock: 100,
    };

    it('should create a product successfully if category exists', async () => {
      const instanceId = new mongoose.Types.ObjectId();
      const mockInstanceReturnedByConstructor = {
        ...productData,
        _id: instanceId,
        save: mockProductSave,
      };

      (mockProductModel as jest.Mock).mockReturnValue(mockInstanceReturnedByConstructor);
      mockProductSave.mockResolvedValue(mockInstanceReturnedByConstructor);

      const result = await productService.createProduct(tenantDbName, productData as IProduct);

      // Assuming ProductService calls CategoryService.getCategoryById to validate category
      expect(mockCategoryServiceInstance.getCategoryById).toHaveBeenCalledWith(tenantDbName, productData.categoryId);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('Product', ProductModelSchema.schema);
      expect(mockProductModel).toHaveBeenCalledWith(productData);
      expect(mockProductSave).toHaveBeenCalledTimes(1);

      expect(result._id).toEqual(instanceId);
      expect(result.name).toBe(productData.name);
      expect(result).toBe(mockInstanceReturnedByConstructor);
    });

    it('should throw an error if category does not exist', async () => {
      mockCategoryServiceInstance.getCategoryById.mockResolvedValue(null); // Simulate category not found

      await expect(productService.createProduct(tenantDbName, productData as IProduct))
        .rejects.toThrow(`Category with id ${productData.categoryId} not found in ${tenantDbName}`);

      expect(mockProductModel).not.toHaveBeenCalled();
      expect(mockProductSave).not.toHaveBeenCalled();
    });

    it('should throw an error if CategoryService throws during category check', async () => {
      const categoryError = new Error('Category service error');
      mockCategoryServiceInstance.getCategoryById.mockRejectedValue(categoryError);

      await expect(productService.createProduct(tenantDbName, productData as IProduct))
        .rejects.toThrow(categoryError);
      expect(mockProductModel).not.toHaveBeenCalled();
    });


    it('should throw an error if product creation fails (database error)', async () => {
      const saveError = new Error('Failed to save product');
      // Category check passes
      mockCategoryServiceInstance.getCategoryById.mockResolvedValue({ _id: categoryObjectId, name: 'Mock Category' } as any);

      // Setup for save failure
      (mockProductModel as jest.Mock).mockImplementation((data?: any) => ({
        ...data,
        save: mockProductSave.mockRejectedValue(saveError), // Save fails
      }));

      await expect(productService.createProduct(tenantDbName, productData as IProduct))
        .rejects.toThrow(saveError);
    });
  });

  describe('getProducts', () => {
    it('should return a list of products', async () => {
      const products = [{ name: 'Laptop', _id: new mongoose.Types.ObjectId() }, { name: 'Mouse', _id: new mongoose.Types.ObjectId() }];
      mockProductFind.mockResolvedValue(products);

      const result = await productService.getProducts(tenantDbName, {}); // Assuming empty filter

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('Product', ProductModelSchema.schema);
      expect(mockProductFind).toHaveBeenCalledWith({});
      expect(result).toEqual(products);
    });

    it('should apply filters if provided', async () => {
      const filter = { categoryId: categoryObjectId.toString() };
      const products = [{ name: 'Laptop', categoryId: categoryObjectId.toString(), _id: new mongoose.Types.ObjectId() }];
      mockProductFind.mockResolvedValue(products);

      const result = await productService.getProducts(tenantDbName, filter);
      expect(mockProductFind).toHaveBeenCalledWith(filter);
      expect(result).toEqual(products);
    });
  });

  describe('getProductById', () => {
    it('should return a product if found by ID', async () => {
      const productId = productObjectId.toString();
      const product = { _id: productId, name: 'Test Product' };
      mockProductFindById.mockResolvedValue(product);

      const result = await productService.getProductById(tenantDbName, productId);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('Product', ProductModelSchema.schema);
      expect(mockProductFindById).toHaveBeenCalledWith(productId);
      expect(result).toEqual(product);
    });

    it('should throw an error if product not found by ID', async () => {
      const productId = new mongoose.Types.ObjectId().toString();
      mockProductFindById.mockResolvedValue(null);

      await expect(productService.getProductById(tenantDbName, productId))
          .rejects.toThrow(`Product with id ${productId} not found in ${tenantDbName}`);
    });
  });

  describe('updateProduct', () => {
    const productId = productObjectId.toString();
    const updateData: Partial<IProduct> = { name: 'Updated Super Laptop', price: 1500 };
    const newCategoryId = new mongoose.Types.ObjectId().toString();

    it('should update a product successfully without category change', async () => {
      const originalProduct = { _id: productId, name: 'Super Laptop', categoryId: categoryObjectId.toString() };
      const updatedProduct = { ...originalProduct, ...updateData };
      mockProductFindOneAndUpdate.mockResolvedValue(updatedProduct);
      // No call to CategoryService if categoryId is not in updateData

      const result = await productService.updateProduct(tenantDbName, productId, updateData);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('Product', ProductModelSchema.schema);
      expect(mockCategoryServiceInstance.getCategoryById).not.toHaveBeenCalled();
      expect(mockProductFindOneAndUpdate).toHaveBeenCalledWith({ _id: productId }, { $set: updateData }, { new: true, runValidators: true });
      expect(result).toEqual(updatedProduct);
    });

    it('should update a product successfully with category change if new category is valid', async () => {
      const updateDataWithCategory: Partial<IProduct> = { ...updateData, categoryId: newCategoryId };
      const originalProduct = { _id: productId, name: 'Super Laptop', categoryId: categoryObjectId.toString() };
      const updatedProduct = { ...originalProduct, ...updateDataWithCategory };

      mockCategoryServiceInstance.getCategoryById.mockResolvedValue({ _id: newCategoryId, name: 'New Mock Category' } as any);
      mockProductFindOneAndUpdate.mockResolvedValue(updatedProduct);

      const result = await productService.updateProduct(tenantDbName, productId, updateDataWithCategory);

      expect(mockCategoryServiceInstance.getCategoryById).toHaveBeenCalledWith(tenantDbName, newCategoryId);
      expect(mockProductFindOneAndUpdate).toHaveBeenCalledWith({ _id: productId }, { $set: updateDataWithCategory }, { new: true, runValidators: true });
      expect(result).toEqual(updatedProduct);
    });


    it('should throw an error if product to update is not found', async () => {
      mockProductFindOneAndUpdate.mockResolvedValue(null);

      await expect(productService.updateProduct(tenantDbName, productId, updateData))
          .rejects.toThrow(`Product with ID '${productId}' not found for update in ${tenantDbName}`);
      expect(mockCategoryServiceInstance.getCategoryById).not.toHaveBeenCalled();
    });

    it('should throw an error if categoryId is updated to a non-existent category', async () => {
      const updateDataWithInvalidCategory: Partial<IProduct> = { ...updateData, categoryId: newCategoryId };
      mockCategoryServiceInstance.getCategoryById.mockResolvedValue(null); // New category not found

      await expect(productService.updateProduct(tenantDbName, productId, updateDataWithInvalidCategory))
          .rejects.toThrow(`Category with id ${newCategoryId} not found in ${tenantDbName}`);
      expect(mockProductFindOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product successfully', async () => {
      const productId = productObjectId.toString();
      const deletedProduct = { _id: productId, name: 'Old Product' };
      mockProductFindByIdAndDelete.mockResolvedValue(deletedProduct);

      const result = await productService.deleteProduct(tenantDbName, productId);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('Product', ProductModelSchema.schema);
      expect(mockProductFindByIdAndDelete).toHaveBeenCalledWith(productId);
      expect(result).toEqual(deletedProduct);
    });

    it('should throw an error if product to delete is not found', async () => {
      const productId = new mongoose.Types.ObjectId().toString();
      mockProductFindByIdAndDelete.mockResolvedValue(null);

      await expect(productService.deleteProduct(tenantDbName, productId))
        .rejects.toThrow(`Product with ID '${productId}' not found for deletion in ${tenantDbName}`);
    });
  });
});
