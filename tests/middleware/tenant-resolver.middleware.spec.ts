import { Request, Response, NextFunction } from 'express';
import { tenantResolver } from '@src/middleware/tenant-resolver.middleware';
import tenantService from '@src/services/platform/tenant.service';

// Mock the tenantService
jest.mock('@src/services/platform/tenant.service');

describe('Tenant Resolver Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let mockTenantServiceExists: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: {} // Ensure locals is initialized
    };
    nextFunction = jest.fn();

    // Setup mock for tenantService.tenantExistsByDatabaseName
    mockTenantServiceExists = jest.fn();
    (tenantService.tenantExistsByDatabaseName as jest.Mock) = mockTenantServiceExists;
  });

  it('should call next() and set res.locals.tenantDbName if tenant exists', async () => {
    const tenantId = 'valid-tenant-slug_123abcde'; // Simulating slug + random part
    const expectedDbName = `db_${tenantId}`;
    mockRequest.headers = { 'x-tenant-id': tenantId };
    mockTenantServiceExists.mockResolvedValue(true);

    await tenantResolver(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockTenantServiceExists).toHaveBeenCalledWith(expectedDbName);
    expect(mockResponse.locals!.tenantDbName).toBe(expectedDbName);
    expect(nextFunction).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should return 400 if X-Tenant-ID header is missing', async () => {
    await tenantResolver(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'Sweetie, the X-Tenant-ID header is missing or invalid! I need it to know which shop we\'re talking about. 🥺'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 400 if X-Tenant-ID header is an empty string', async () => {
    mockRequest.headers = { 'x-tenant-id': '' };
    await tenantResolver(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'Sweetie, the X-Tenant-ID header is missing or invalid! I need it to know which shop we\'re talking about. 🥺'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 400 if X-Tenant-ID leads to "db_undefined" or "db_null"', async () => {
    // This test case is based on the explicit check in the middleware
    mockRequest.headers = { 'x-tenant-id': 'undefined' };
    await tenantResolver(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'Tenant database name could not be determined from the header. Please check your X-Tenant-ID. 😞'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 404 if tenant does not exist', async () => {
    const tenantId = 'nonexistent-tenant-slug';
    const expectedDbName = `db_${tenantId}`;
    mockRequest.headers = { 'x-tenant-id': tenantId };
    mockTenantServiceExists.mockResolvedValue(false);

    await tenantResolver(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockTenantServiceExists).toHaveBeenCalledWith(expectedDbName);
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'Tenant not found. Please check your tenant ID. 🥺'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 500 if tenantService.tenantExistsByDatabaseName throws an error', async () => {
    const tenantId = 'error-tenant-slug';
    const expectedDbName = `db_${tenantId}`;
    mockRequest.headers = { 'x-tenant-id': tenantId };
    const errorMessage = 'Database lookup failed';
    mockTenantServiceExists.mockRejectedValue(new Error(errorMessage));

    await tenantResolver(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockTenantServiceExists).toHaveBeenCalledWith(expectedDbName);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'There was a problem verifying the tenant. Please try again later. 😥',
      error: errorMessage
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  // Test based on the identified potential mismatch:
  // If X-Tenant-ID is just the 'slug', but tenantExistsByDatabaseName expects 'db_slug_randompart'
  // For this test, let's assume tenantExistsByDatabaseName is strict.
  // The middleware currently constructs dbName as `db_${rawTenantId}`.
  // If rawTenantId = "my-shop", it checks for "db_my-shop".
  // If the actual db name is "db_my-shop_xyz123", this check would fail.
  it('POTENTIAL ISSUE TEST: should return 404 if X-Tenant-ID is a slug and service expects full db name component', async () => {
    const tenantSlug = 'my-shop'; // Just the slug
    const constructedDbNameForLookup = `db_${tenantSlug}`; // This is what the middleware currently constructs
    mockRequest.headers = { 'x-tenant-id': tenantSlug };

    // Simulate tenantService.tenantExistsByDatabaseName strictly expecting the full "db_slug_randompart"
    // So, a lookup for "db_my-shop" would return false.
    mockTenantServiceExists.mockImplementation(async (dbName: string) => {
      if (dbName === constructedDbNameForLookup) {
        return false; // Because it's not the full "db_my-shop_xyz123"
      }
      return false;
    });

    await tenantResolver(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockTenantServiceExists).toHaveBeenCalledWith(constructedDbNameForLookup);
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'Tenant not found. Please check your tenant ID. 🥺'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
