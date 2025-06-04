import { ProductService } from '../product.service';
import { CreateProductDto, UpdateProductDto } from '../../../types/product.dto';

// 1. Mock Product Model Schema
jest.mock('../../../model/application/product.model', () => {
  const { Schema } = require('mongoose');
  const mockSchema = new Schema({
    name: String, sku: String, price: Number, category: { type: Schema.Types.ObjectId, ref: 'Category' },
  });
  return { __esModule: true, default: { schema: mockSchema } };
});

// 2. Mock Category Model Schema
jest.mock('../../../model/application/category.model', () => {
  const { Schema } = require('mongoose');
  const mockSchema = new Schema({ name: String, slug: String });
  return { __esModule: true, default: { schema: mockSchema } };
});

// 3. Mock Mongoose Module
jest.mock('mongoose', () => {
  const originalMongoose = jest.requireActual('mongoose');

  // Define all query mocks and model constructor mocks *inside* this factory
  const mockExec = jest.fn();
  const mockPopulate = jest.fn().mockReturnThis();
  const mockSort = jest.fn().mockReturnThis();
  const mockLimit = jest.fn().mockReturnThis();
  const mockSkip = jest.fn().mockReturnThis();

  const mockQuery = {
    exec: mockExec,
    populate: mockPopulate,
    sort: mockSort,
    limit: mockLimit,
    skip: mockSkip,
  };

  const mockInstanceSave = jest.fn();

  const LocalMockProductModelConstructor = jest.fn().mockImplementation(function(data) {
    Object.assign(this, data);
    this.save = mockInstanceSave; // Instance save method
  });
  // Static methods for Product Model
  LocalMockProductModelConstructor.find = jest.fn(() => mockQuery);
  LocalMockProductModelConstructor.findOne = jest.fn(() => mockQuery);
  LocalMockProductModelConstructor.findOneAndUpdate = jest.fn(() => mockQuery);
  LocalMockProductModelConstructor.findOneAndDelete = jest.fn(() => mockQuery);
  LocalMockProductModelConstructor.findById = jest.fn(() => mockQuery);
  LocalMockProductModelConstructor.create = jest.fn(); // Static create
  // Assign prototype save for instances if not using 'this.save = ...' in constructor
  // LocalMockProductModelConstructor.prototype.save = mockInstanceSave;


  const LocalMockCategoryModelConstructor = jest.fn().mockImplementation(function(data) {
     Object.assign(this, data);
     this.save = mockInstanceSave; // Or a separate save mock if categories are saved by ProductService
  });
  LocalMockCategoryModelConstructor.findById = jest.fn(() => mockQuery); // Example

  return {
    ...originalMongoose,
    connect: jest.fn().mockResolvedValue(undefined),
    connection: {
      ...originalMongoose.connection,
      useDb: jest.fn().mockImplementation((dbName: string) => ({
        model: jest.fn().mockImplementation((modelName: string) => {
          if (modelName === 'Product') return LocalMockProductModelConstructor;
          if (modelName === 'Category') return LocalMockCategoryModelConstructor;
          return jest.fn().mockImplementation(() => ({ exec: jest.fn() })); // Default mock for other models
        }),
      })),
      readyState: 1,
      close: jest.fn().mockResolvedValue(undefined),
    },
    model: jest.fn().mockImplementation((modelName: string) => {
        if (modelName === 'Product') return LocalMockProductModelConstructor;
        if (modelName === 'Category') return LocalMockCategoryModelConstructor;
        return jest.fn().mockImplementation(() => ({ exec: jest.fn() }));
    }),
    Schema: originalMongoose.Schema,
    Types: originalMongoose.Types,
  };
});

// --- Test Suite ---
describe('ProductService', () => {
  let productService: ProductService;
  let mockProductModel: any; // Will hold LocalMockProductModelConstructor
  let mockCategoryModel: any; // Will hold LocalMockCategoryModelConstructor

  // To access query builder mocks and instance save mock
  let queryMocks: { exec: jest.Mock, populate: jest.Mock, sort: jest.Mock, limit: jest.Mock, skip: jest.Mock };
  let productInstanceSaveMock: jest.Mock;


  beforeEach(() => {
    jest.clearAllMocks();
    const mongoose = require('mongoose'); // Get the mocked mongoose

    // Retrieve the mocked constructors and their methods
    // The .model() call from the mocked mongoose will return our LocalMock...Constructors
    mockProductModel = mongoose.model('Product');
    mockCategoryModel = mongoose.model('Category'); // If needed for direct use, otherwise schema mock is enough for populate

    // Retrieve query and save mocks from the mongoose factory scope (tricky, direct access is better if possible)
    // This requires them to be exposed by the mock, or re-accessed.
    // For simplicity, we'll re-assign from the static methods of the retrieved mock models.
    queryMocks = {
        exec: mockProductModel.find().exec, // exec is the same jest.fn across all query objects from this mock
        populate: mockProductModel.find().populate,
        sort: mockProductModel.find().sort,
        limit: mockProductModel.find().limit,
        skip: mockProductModel.find().skip,
    };

    // productInstanceSaveMock should be the one used by product instances
    // If using `this.save = mockInstanceSave` in constructor:
    //  productInstanceSaveMock = mockInstanceSave; // from outer scope - this is the issue
    // If using `prototype.save`:
    //  productInstanceSaveMock = mockProductModel.prototype.save;
    // Given the current mock: `this.save = mockInstanceSave` where mockInstanceSave is from the factory's scope.
    // We need a way to get that specific `mockInstanceSave` from the factory.
    // The easiest way is to ensure all instances created by MockProductModelConstructor.create or new MockProductModelConstructor()
    // use the same jest.fn() for save.
    // Let's get it from where it's defined in the mock.
    // This is a bit of a hack due to scope. It's generally cleaner if the mock module exports these.
    // For now, we'll assume the static .create and instance .save() are correctly mocked.
    // The static `create` mock on `LocalMockProductModelConstructor` will be used for `Model.create()`.
    // The `mockInstanceSave` from the factory will be used for `instance.save()`.
    // We need to ensure `productInstanceSaveMock` in tests refers to that `mockInstanceSave`.
    // This is implicitly handled if `MockProductModelConstructor.create` is correctly mocked or if
    // `new MockProductModelConstructor().save()` uses the `mockInstanceSave` from the factory.
    // The current mock for `new LocalMockProductModelConstructor().save` IS `mockInstanceSave`.
    // So, we can get it via a new instance, or if Model.create is used, its mock.

    // Re-assigning from the mock module's scope (this is the tricky part to do cleanly from outside)
    // For now, let's assume the static create method is what we configure for "create" tests
    // and for "update/delete" that use instance.save(), we'll rely on the setup.
    // The beforeEach needs to reset the top-level mocks from the factory.
    // Accessing them directly is hard. So, reset them by re-accessing from mongoose.model()
    mockProductModel.find.mockClear(); // Clears the call count for mockQuery as well, since it's shared.
    queryMocks.exec.mockReset();
    queryMocks.populate.mockReset().mockReturnThis();
    queryMocks.sort.mockReset().mockReturnThis();
    queryMocks.limit.mockReset().mockReturnThis();
    queryMocks.skip.mockReset().mockReturnThis();

    mockProductModel.findOne.mockClear();
    mockProductModel.findOneAndUpdate.mockClear();
    mockProductModel.findOneAndDelete.mockClear();
    mockProductModel.findById.mockClear();
    mockProductModel.create.mockReset(); // For Model.create()

    // For instance.save() used by `new Model().save()` implicitly in `Model.create` or directly
    // This is harder to reset from outside the factory if not on prototype.
    // However, our `LocalMockProductModelConstructor` assigns `this.save = mockInstanceSave;`
    // So, `mockInstanceSave` (from factory scope) should be reset.
    // This is a structural issue with accessing mocks defined deep in factory.
    // A common pattern is to have the factory EXPORT the mocks, but that's more setup.
    // For now, we trust jest.clearAllMocks() and specific resets.
    // Let's ensure productInstanceSaveMock is explicitly the one from the factory.
    // This is still problematic. The best is to use prototype for instance methods.

    // Get the mockInstanceSave from the factory scope (it's tricky, but jest.clearAllMocks() should handle it)
    // We will assign it to productInstanceSaveMock in relevant tests or rely on its global nature in the mock.
    // For the `createProduct` test, we will specifically mock the `save` method on the instance.
    // For other tests, static mocks are used.

    productService = new ProductService('dummyTenantId');
  });

  const mockCategory = { _id: 'cat1', name: 'Electronics' };
  const mockProducts = [
    { _id: 'prod1', name: 'Laptop', sku: 'LP100', price: 1200, category: mockCategory },
    { _id: 'prod2', name: 'Mouse', sku: 'MS200', price: 25, category: mockCategory },
  ];

  describe('getAllProducts', () => {
    it('should return an array of products with populated category', async () => {
      queryMocks.exec.mockResolvedValue(mockProducts);
      const products = await productService.getAllProducts({});
      expect(products).toEqual(mockProducts);
      expect(mockProductModel.find).toHaveBeenCalledWith({});
      expect(queryMocks.populate).toHaveBeenCalledWith(expect.objectContaining({ path: 'category' }));
      expect(queryMocks.exec).toHaveBeenCalled();
    });

    it('should handle pagination', async () => {
        queryMocks.exec.mockResolvedValue([mockProducts[0]]);
        await productService.getAllProducts({ page: 1, limit: 1 });
        expect(mockProductModel.find).toHaveBeenCalledWith({});
        expect(queryMocks.populate).toHaveBeenCalledWith(expect.objectContaining({ path: 'category' }));
        expect(queryMocks.skip).toHaveBeenCalledWith(0);
        expect(queryMocks.limit).toHaveBeenCalledWith(1);
        expect(queryMocks.exec).toHaveBeenCalled();
    });

    it('should throw an error if database operation fails', async () => {
      queryMocks.exec.mockRejectedValue(new Error('DB Error'));
      await expect(productService.getAllProducts({})).rejects.toThrow('Failed to retrieve products.');
    });
  });

  describe('getProductBySku', () => {
    it('should return a product with populated category when found', async () => {
      queryMocks.exec.mockResolvedValue(mockProducts[0]);
      const product = await productService.getProductBySku('LP100');
      expect(product).toEqual(mockProducts[0]);
      expect(mockProductModel.findOne).toHaveBeenCalledWith({ sku: 'LP100' });
      expect(queryMocks.populate).toHaveBeenCalledWith(expect.objectContaining({ path: 'category' }));
      expect(queryMocks.exec).toHaveBeenCalled();
    });

    it('should return null if product not found', async () => {
      queryMocks.exec.mockResolvedValue(null);
      const product = await productService.getProductBySku('UNKNOWN');
      expect(product).toBeNull();
    });

    it('should throw an error if database operation fails', async () => {
      queryMocks.exec.mockRejectedValue(new Error('DB Error'));
      await expect(productService.getProductBySku('LP100')).rejects.toThrow('Failed to retrieve product by SKU.');
    });
  });

  describe('getProductByCategory', () => {
    it('should return products for a given categoryId with populated category', async () => {
      queryMocks.exec.mockResolvedValue([mockProducts[0]]);
      const products = await productService.getProductbyCategory('cat1');
      expect(products).toEqual([mockProducts[0]]);
      expect(mockProductModel.find).toHaveBeenCalledWith({ category: 'cat1' });
      expect(queryMocks.populate).toHaveBeenCalledWith(expect.objectContaining({ path: 'category' }));
      expect(queryMocks.exec).toHaveBeenCalled();
    });

    it('should throw an error if database operation fails', async () => {
      queryMocks.exec.mockRejectedValue(new Error('DB Error'));
      await expect(productService.getProductbyCategory('cat1')).rejects.toThrow('Failed to retrieve products by category.');
    });
  });

  describe('searchProducts', () => {
    it('should return matching products with populated category', async () => {
      queryMocks.exec.mockResolvedValue([mockProducts[0]]);
      const products = await productService.searchProducts('Laptop');
      expect(products).toEqual([mockProducts[0]]);
      expect(mockProductModel.find).toHaveBeenCalledWith({ name: { $regex: 'Laptop', $options: 'i' } });
      expect(queryMocks.populate).toHaveBeenCalledWith(expect.objectContaining({ path: 'category' }));
      expect(queryMocks.exec).toHaveBeenCalled();
    });

    it('should return an empty array if no products match', async () => {
      queryMocks.exec.mockResolvedValue([]);
      const products = await productService.searchProducts('NonExistent');
      expect(products).toEqual([]);
    });

    it('should throw an error if database operation fails', async () => {
      queryMocks.exec.mockRejectedValue(new Error('DB Error'));
      await expect(productService.searchProducts('query')).rejects.toThrow('Failed to search products.');
    });
  });

  describe('createProduct', () => {
    it('should create and return a new product', async () => {
      const dto: CreateProductDto = { name: 'Keyboard', sku: 'KB300', price: 75, categoryId: 'cat1' };
      const productDataForSave = { name: dto.name, sku: dto.sku, price: dto.price, category: dto.categoryId };
      const expectedProductProperties = { ...productDataForSave, _id: 'prod3DB' };

      const instanceSaveMock = jest.fn().mockImplementation(function() {
        // 'this' refers to the instance created by new mockProductModel()
        this._id = 'prod3DB'; // Simulate Mongoose adding an _id to the instance
        return Promise.resolve(this); // Simulate Mongoose save resolving with the instance
      });

      mockProductModel.mockImplementationOnce(function(data: any) {
        Object.assign(this, data);
        this.save = instanceSaveMock;
        return this;
      });

      const product = await productService.createProduct(dto);

      expect(mockProductModel).toHaveBeenCalledWith(productDataForSave);
      expect(instanceSaveMock).toHaveBeenCalled();
      expect(product).toEqual(expect.objectContaining(expectedProductProperties));
    });

    it('should throw an error if database operation fails', async () => {
      const dto: CreateProductDto = { name: 'Keyboard', sku: 'KB300', price: 75, categoryId: 'cat1' };
      const productDataForSave = { name: dto.name, sku: dto.sku, price: dto.price, category: dto.categoryId };

      const instanceSaveMock = jest.fn().mockRejectedValue(new Error('Validation Failed'));
      mockProductModel.mockImplementationOnce(function(data: any) {
        Object.assign(this, data);
        this.save = instanceSaveMock;
        return this;
      });

      await expect(productService.createProduct(dto)).rejects.toThrow('Validation Failed');
      expect(mockProductModel).toHaveBeenCalledWith(productDataForSave);
      expect(instanceSaveMock).toHaveBeenCalled();
    });
  });

  describe('updateProduct', () => {
    it('should update and return the product', async () => {
      const dto: UpdateProductDto = { name: 'Laptop Pro X' };
      const updatedProduct = { ...mockProducts[0], ...dto };
      queryMocks.exec.mockResolvedValue(updatedProduct);

      const product = await productService.updateProduct('LP100', dto);
      expect(product).toEqual(updatedProduct);
      expect(mockProductModel.findOneAndUpdate).toHaveBeenCalledWith({ sku: 'LP100' }, dto, { new: true, runValidators: true }); // Added runValidators
      expect(queryMocks.populate).toHaveBeenCalledWith(expect.objectContaining({ path: 'category' }));
      expect(queryMocks.exec).toHaveBeenCalled();
    });

    it('should throw an error if product to update is not found', async () => {
      queryMocks.exec.mockResolvedValue(null);
      const dto: UpdateProductDto = { name: 'Laptop Pro X' };
      await expect(productService.updateProduct('UNKNOWN', dto)).rejects.toThrow('Product not found or update failed.');
    });

    it('should throw an error if database operation fails', async () => {
      queryMocks.exec.mockRejectedValue(new Error('DB Error'));
      const dto: UpdateProductDto = { name: 'Laptop Pro X' };
      await expect(productService.updateProduct('LP100', dto)).rejects.toThrow('Failed to update product.');
    });
  });

  describe('deleteProduct', () => {
    it('should delete and return the product', async () => {
      queryMocks.exec.mockResolvedValue(mockProducts[0]);
      const product = await productService.deleteProduct('LP100');
      expect(product).toEqual(mockProducts[0]);
      expect(mockProductModel.findOneAndDelete).toHaveBeenCalledWith({ sku: 'LP100' });
      expect(queryMocks.populate).toHaveBeenCalledWith(expect.objectContaining({ path: 'category' }));
      expect(queryMocks.exec).toHaveBeenCalled();
    });

    it('should throw an error if product to delete is not found', async () => {
      queryMocks.exec.mockResolvedValue(null);
      await expect(productService.deleteProduct('UNKNOWN')).rejects.toThrow('Product not found or delete failed.');
    });

    it('should throw an error if database operation fails', async () => {
      queryMocks.exec.mockRejectedValue(new Error('DB Error'));
      await expect(productService.deleteProduct('LP100')).rejects.toThrow('Failed to delete product.');
    });
  });
});
