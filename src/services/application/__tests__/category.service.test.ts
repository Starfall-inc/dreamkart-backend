import { CategoryService } from '../category.service';
import { CreateCategoryDto } from '../../../dto/category.dto';

// Mock the Category model's schema
jest.mock('../../../model/application/category.model', () => {
  const { Schema } = require('mongoose');
  const mockSchema = new Schema({
    name: String,
    slug: String,
    parentId: String,
    images: [String],
    description: String,
  });
  return {
    __esModule: true,
    default: { schema: mockSchema },
  };
});

// Mock the mongoose module
jest.mock('mongoose', () => {
  const originalMongoose = jest.requireActual('mongoose');

  // This is our mock constructor for Mongoose models
  const MockModelConstructor = jest.fn().mockImplementation(function(data) {
    // Simulate instance properties assignment from data
    Object.assign(this, data);
    // `this.save` will be `MockModelConstructor.prototype.save` due to JS prototype chain
    return this;
  });

  // Mock static methods on the constructor
  MockModelConstructor.find = jest.fn();
  MockModelConstructor.findOne = jest.fn();
  MockModelConstructor.findById = jest.fn();
  MockModelConstructor.create = jest.fn(); // create is a static method

  // Mock instance methods on the prototype
  MockModelConstructor.prototype.save = jest.fn(); // save is an instance method

  return {
    ...originalMongoose, // Keep other mongoose exports (Schema, Types, etc.)
    connect: jest.fn().mockResolvedValue(undefined), // Mock connect to prevent actual DB connection
    connection: {
      ...originalMongoose.connection,
      useDb: jest.fn().mockReturnValue({ // Mock useDb
        model: jest.fn().mockReturnValue(MockModelConstructor), // useDb().model() returns our mock constructor
      }),
      readyState: 1, // Simulate connected state
      close: jest.fn().mockResolvedValue(undefined),
    },
    model: jest.fn().mockReturnValue(MockModelConstructor), // For any direct mongoose.model calls
  };
});

describe('CategoryService', () => {
  let categoryService: CategoryService;
  let staticModelMocks: {
    find: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
  };
  let instanceSaveMock: jest.Mock;
  let MockedCategoryModel: jest.Mock; // To hold the constructor itself for "toHaveBeenCalledWith" on constructor

  beforeEach(() => {
    jest.clearAllMocks();

    // Obtain the mock constructor from the mocked mongoose module
    // require('mongoose').model() will return our MockModelConstructor due to the mock setup
    MockedCategoryModel = require('mongoose').model();

    staticModelMocks = {
      find: MockedCategoryModel.find,
      findOne: MockedCategoryModel.findOne,
      findById: MockedCategoryModel.findById,
      create: MockedCategoryModel.create, // Used if service calls Model.create()
    };
    instanceSaveMock = MockedCategoryModel.prototype.save; // This is the mock for instance.save()

    // Reset all mock function states
    Object.values(staticModelMocks).forEach(mockFn => mockFn.mockReset());
    instanceSaveMock.mockReset();
    MockedCategoryModel.mockClear(); // Clears call counts and instances of the constructor itself

    categoryService = new CategoryService('dummyTenantId');
  });

  describe('getCategories', () => {
    it('should return an array of categories on success', async () => {
      const mockCategories = [{ name: 'Category 1' }, { name: 'Category 2' }];
      staticModelMocks.find.mockResolvedValue(mockCategories);

      const categories = await categoryService.getCategories();
      expect(categories).toEqual(mockCategories);
      expect(staticModelMocks.find).toHaveBeenCalledWith({ parentId: null });
      const mongoose = require('mongoose'); // Get the mocked mongoose
      expect(mongoose.connection.useDb).toHaveBeenCalledWith('dummyTenantId', { useCache: true });
      expect(mongoose.connection.useDb().model).toHaveBeenCalledWith('Category', expect.anything());
    });

    it('should throw an error if database operation fails', async () => {
      staticModelMocks.find.mockRejectedValue(new Error('Database error'));
      await expect(categoryService.getCategories()).rejects.toThrow('Failed to retrieve categories.');
    });
  });

  describe('getCategoryBySlug', () => {
    it('should return a category when found', async () => {
      const mockCategory = { name: 'Category 1', slug: 'category-1' };
      staticModelMocks.findOne.mockResolvedValue(mockCategory);
      const category = await categoryService.getCategoryBySlug('category-1');
      expect(category).toEqual(mockCategory);
      expect(staticModelMocks.findOne).toHaveBeenCalledWith({ slug: 'category-1' });
    });

    it('should return null when category is not found', async () => {
      staticModelMocks.findOne.mockResolvedValue(null);
      const category = await categoryService.getCategoryBySlug('non-existent-slug');
      expect(category).toBeNull();
    });

    it('should throw an error if database operation fails', async () => {
      staticModelMocks.findOne.mockRejectedValue(new Error('Database error'));
      await expect(categoryService.getCategoryBySlug('any-slug')).rejects.toThrow('Failed to retrieve category.');
    });
  });

  describe('getCategoryById', () => {
    it('should return a category when found', async () => {
      const mockCategory = { name: 'Category 1', _id: 'some-id' };
      staticModelMocks.findById.mockResolvedValue(mockCategory);
      const category = await categoryService.getCategoryById('some-id');
      expect(category).toEqual(mockCategory);
      expect(staticModelMocks.findById).toHaveBeenCalledWith('some-id');
    });

    it('should return null when category is not found', async () => {
      staticModelMocks.findById.mockResolvedValue(null);
      const category = await categoryService.getCategoryById('non-existent-id');
      expect(category).toBeNull();
    });

    it('should throw an error if database operation fails', async () => {
      staticModelMocks.findById.mockRejectedValue(new Error('Database error'));
      await expect(categoryService.getCategoryById('any-id')).rejects.toThrow('Failed to retrieve category.');
    });
  });

  describe('createCategory', () => {
    it('should create and return a new category on success', async () => {
      const createCategoryDto: CreateCategoryDto = { name: 'New Category', slug: 'new-category' };

      // Mock the save method to simulate Mongoose behavior:
      // it mutates the instance (e.g., adds _id) and resolves with the instance.
      instanceSaveMock.mockImplementation(function() {
        this._id = 'new-id'; // 'this' is the instance created by new MockedCategoryModel()
        return Promise.resolve(this);
      });

      const category = await categoryService.createCategory(createCategoryDto);

      expect(MockedCategoryModel).toHaveBeenCalledWith(createCategoryDto);
      expect(instanceSaveMock).toHaveBeenCalled();

      // Check that the returned category is an object containing the DTO's properties and the new _id.
      // It will also contain the 'save' method due to how the mock constructor works, so use objectContaining.
      expect(category).toEqual(expect.objectContaining({
        ...createCategoryDto,
        _id: 'new-id',
      }));
    });

    it('should throw an error if database operation fails (e.g. save fails)', async () => {
      const createCategoryDto: CreateCategoryDto = { name: 'New Category', slug: 'new-category' };
      instanceSaveMock.mockRejectedValue(new Error('Validation error')); // Simulate instance.save() failing

      await expect(categoryService.createCategory(createCategoryDto)).rejects.toThrow('Validation error');
      expect(MockedCategoryModel).toHaveBeenCalledWith(createCategoryDto);
      expect(instanceSaveMock).toHaveBeenCalled();
    });
  });

  describe('getAllCategories', () => {
    it('should return an array of all categories on success', async () => {
      const mockCategories = [{ name: 'Category 1' }, { name: 'Category 2' }];
      staticModelMocks.find.mockResolvedValue(mockCategories);
      const categories = await categoryService.getAllCategories();
      expect(categories).toEqual(mockCategories);
      expect(staticModelMocks.find).toHaveBeenCalledWith({});
    });

    it('should throw an error if database operation fails', async () => {
      staticModelMocks.find.mockRejectedValue(new Error('Database error'));
      await expect(categoryService.getAllCategories()).rejects.toThrow('{func: getAllCategories} -> Failed to retrieve all categories.');
    });
  });
});
