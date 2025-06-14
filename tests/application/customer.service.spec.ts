import mongoose from 'mongoose';
import CustomerService from '@src/services/application/customer.service';
import { ICustomer } from '@src/model/application/customer.model'; // For type
import CustomerModelSchema from '@src/model/application/customer.model'; // Import the actual model for schema access
import * as TenantDbConnection from '@src/connection/tenantDb';

// Mock the getTenantDb utility
jest.mock('@src/connection/tenantDb');

describe('CustomerService (Application Level)', () => {
  let mockGetTenantDb: jest.Mock;
  let mockTenantDbInstance: any;

  // Mocks for CustomerModel
  let mockCustomerModel: any;
  let mockCustomerSave: jest.Mock;
  let mockCustomerFindById: jest.Mock;
  let mockCustomerFindOneAndUpdate: jest.Mock; // For updateCustomer
  let mockCustomerFindByIdAndDelete: jest.Mock; // For deleteCustomer

  const tenantDbName = 'test_tenant_db_for_customer_service';
  const customerObjectId = new mongoose.Types.ObjectId(); // Consistent ObjectId for tests

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock functions for the Customer model methods
    mockCustomerSave = jest.fn();
    mockCustomerFindById = jest.fn();
    mockCustomerFindOneAndUpdate = jest.fn();
    mockCustomerFindByIdAndDelete = jest.fn();

    // Mock CustomerModel constructor
    mockCustomerModel = jest.fn().mockImplementation((data?: any) => {
      // This instance is what `new CustomerModel(data)` returns
      return {
        ...data,
        _id: data?._id || new mongoose.Types.ObjectId(),
        save: mockCustomerSave, // Its save method is our shared mockCustomerSave
      };
    });

    // Attach static methods to the mock constructor
    mockCustomerModel.findById = mockCustomerFindById;
    mockCustomerModel.findOneAndUpdate = mockCustomerFindOneAndUpdate; // Used by service's updateCustomer
    mockCustomerModel.findByIdAndDelete = mockCustomerFindByIdAndDelete; // Used by service's deleteCustomer
    mockCustomerModel.schema = CustomerModelSchema.schema;

    // Default behavior for save, can be overridden in tests
    mockCustomerSave.mockResolvedValue({ _id: customerObjectId, name: 'Default Saved Customer' });

    mockTenantDbInstance = {
      model: jest.fn().mockImplementation((modelName: string) => {
        if (modelName === 'Customer') {
          return mockCustomerModel;
        }
        // Fallback for other models if any are used indirectly
        const GenericMockModel = jest.fn((data?: any) => ({ ...data, save: jest.fn().mockResolvedValue(data) }));
        GenericMockModel.findById = jest.fn().mockResolvedValue(null);
        GenericMockModel.schema = new mongoose.Schema({});
        return GenericMockModel;
      }),
    };

    mockGetTenantDb = TenantDbConnection.getTenantDb as jest.Mock;
    mockGetTenantDb.mockReturnValue(mockTenantDbInstance);
  });

  // CustomerService is imported as an instance (singleton)
  const customerService = CustomerService;

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      const customerData: Partial<ICustomer> = { name: 'John Doe', email: 'john.doe@example.com' };
      const instanceId = new mongoose.Types.ObjectId();

      const mockInstanceReturnedByConstructor = {
        ...customerData,
        _id: instanceId,
        save: mockCustomerSave,
      };

      (mockCustomerModel as jest.Mock).mockReturnValue(mockInstanceReturnedByConstructor);
      mockCustomerSave.mockResolvedValue(mockInstanceReturnedByConstructor); // instance.save() resolves to the instance

      const result = await customerService.createCustomer(tenantDbName, customerData as ICustomer);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('Customer', CustomerModelSchema.schema);
      expect(mockCustomerModel).toHaveBeenCalledWith(customerData);
      expect(mockCustomerSave).toHaveBeenCalledTimes(1);

      expect(result._id).toEqual(instanceId);
      expect(result.name).toBe(customerData.name);
      expect(result.email).toBe(customerData.email);
      expect(result).toBe(mockInstanceReturnedByConstructor);
    });

    it('should throw an error if customer creation fails', async () => {
      const customerData: Partial<ICustomer> = { name: 'Test User', email: 'test@example.com' };
      const saveError = new Error('Failed to save customer');
      mockCustomerSave.mockRejectedValue(saveError);
      // Ensure the constructor is still called
      (mockCustomerModel as jest.Mock).mockImplementation((data?: any) => ({
        ...data,
        save: mockCustomerSave,
      }));


      await expect(customerService.createCustomer(tenantDbName, customerData as ICustomer))
        .rejects.toThrow(saveError);
    });
  });

  describe('getCustomerById', () => {
    it('should return a customer if found by ID', async () => {
      const customerId = customerObjectId.toString();
      const customer = { _id: customerId, name: 'Jane Doe', email: 'jane.doe@example.com' };
      mockCustomerFindById.mockResolvedValue(customer);

      const result = await customerService.getCustomerById(tenantDbName, customerId);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('Customer', CustomerModelSchema.schema);
      expect(mockCustomerFindById).toHaveBeenCalledWith(customerId);
      expect(result).toEqual(customer);
    });

    it('should throw an error if customer not found by ID', async () => {
      const customerId = new mongoose.Types.ObjectId().toString();
      mockCustomerFindById.mockResolvedValue(null); // Simulate findById not finding anything

      // Based on category.service.spec.ts, services throw an error when not found by ID
      await expect(customerService.getCustomerById(tenantDbName, customerId))
          .rejects.toThrow(`Customer with id ${customerId} not found in ${tenantDbName}`);
    });
  });

  describe('updateCustomer', () => {
    it('should update a customer successfully', async () => {
      const customerId = customerObjectId.toString();
      const updateData: Partial<ICustomer> = { name: 'John Doe Updated' };
      const updatedCustomer = { _id: customerId, name: 'John Doe Updated', email: 'john.doe@example.com' };
      // findOneAndUpdate is used for updates in category service, assuming similar for customer
      mockCustomerFindOneAndUpdate.mockResolvedValue(updatedCustomer);

      const result = await customerService.updateCustomer(tenantDbName, customerId, updateData);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('Customer', CustomerModelSchema.schema);
      // Assuming updateCustomer uses findOneAndUpdate with customerId (which is _id here)
      // If it uses a different field (e.g. a custom `customerId` field), this query part needs change
      expect(mockCustomerFindOneAndUpdate).toHaveBeenCalledWith({ _id: customerId }, { $set: updateData }, { new: true, runValidators: true });
      expect(result).toEqual(updatedCustomer);
    });

    it('should throw an error if customer to update is not found', async () => {
      const customerId = new mongoose.Types.ObjectId().toString();
      const updateData: Partial<ICustomer> = { name: 'Non Existent' };
      mockCustomerFindOneAndUpdate.mockResolvedValue(null); // Simulate customer not found for update

      await expect(customerService.updateCustomer(tenantDbName, customerId, updateData))
          .rejects.toThrow(`Customer with ID '${customerId}' not found for update in ${tenantDbName}`);
    });
  });

  describe('deleteCustomer', () => {
    it('should delete a customer successfully', async () => {
      const customerId = customerObjectId.toString();
      const deletedCustomer = { _id: customerId, name: 'Old Customer', email: 'old@example.com' };
      // findByIdAndDelete is a common Mongoose method for this
      mockCustomerFindByIdAndDelete.mockResolvedValue(deletedCustomer);

      const result = await customerService.deleteCustomer(tenantDbName, customerId);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('Customer', CustomerModelSchema.schema);
      expect(mockCustomerFindByIdAndDelete).toHaveBeenCalledWith(customerId);
      expect(result).toEqual(deletedCustomer);
    });

    it('should throw an error if customer to delete is not found', async () => {
      const customerId = new mongoose.Types.ObjectId().toString();
      mockCustomerFindByIdAndDelete.mockResolvedValue(null); // Simulate customer not found for deletion

      await expect(customerService.deleteCustomer(tenantDbName, customerId))
        .rejects.toThrow(`Customer with ID '${customerId}' not found for deletion in ${tenantDbName}`);
    });
  });
});
