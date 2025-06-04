import mongoose from 'mongoose';
import { getTenantDb } from '@src/connection/tenantDb'; // Assuming path alias is working

jest.mock('mongoose', () => {
  const originalMongoose = jest.requireActual('mongoose');
  // The mock function is created within the factory's scope
  const internalMockUseDb = jest.fn();
  return {
    ...originalMongoose,
    connection: {
      useDb: internalMockUseDb,
    },
    // A way to access this specific mock instance if needed, though not strictly necessary
    // if tests access it via mongoose.connection.useDb after importing mocked mongoose.
    __INTERNAL_MOCK_USE_DB_DO_NOT_USE_IN_TESTS_DIRECTLY__: internalMockUseDb,
  };
});

describe('Tenant DB Connection Utility (getTenantDb)', () => {
  // This will hold the reference to the mock function (mongoose.connection.useDb)
  let effectiveMockUseDb: jest.Mock;

  beforeEach(() => {
    // After jest.mock has run, mongoose and its properties are the mocked versions.
    // So, mongoose.connection.useDb is the internalMockUseDb from the factory.
    effectiveMockUseDb = mongoose.connection.useDb as jest.Mock;
    effectiveMockUseDb.mockClear();
    // Default implementation, can be overridden by mockReturnValue/mockImplementation in tests
    effectiveMockUseDb.mockImplementation(() => ({}));
  });

  it('should call mongoose.connection.useDb with the tenantDbName and useCache:true', () => {
    const tenantDbName = 'test_tenant_db';
    const mockDbInstance = { name: tenantDbName };
    effectiveMockUseDb.mockReturnValue(mockDbInstance);

    const db = getTenantDb(tenantDbName);

    expect(effectiveMockUseDb).toHaveBeenCalledTimes(1);
    expect(effectiveMockUseDb).toHaveBeenCalledWith(tenantDbName, { useCache: true });
    expect(db).toEqual(mockDbInstance);
  });

  it('should return the Db instance returned by mongoose.connection.useDb', () => {
    const tenantDbName = 'another_tenant_db';
    const expectedDbInstance = {
      name: tenantDbName,
      model: jest.fn(),
      dropDatabase: jest.fn()
    };
    effectiveMockUseDb.mockReturnValue(expectedDbInstance);

    const db = getTenantDb(tenantDbName);
    expect(db).toBe(expectedDbInstance); // Check if the returned object is the same one
  });

  it('should throw an error if mongoose.connection.useDb throws an error', () => {
    const tenantDbName = 'error_db';
    const errorMessage = 'Failed to switch DB';
    effectiveMockUseDb.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    expect(() => {
      getTenantDb(tenantDbName);
    }).toThrow(`Failed to connect to tenant database: ${tenantDbName}`);

    expect(effectiveMockUseDb).toHaveBeenCalledWith(tenantDbName, { useCache: true });
  });
});
