import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateCustomer } from '@src/middleware/customerAuth.middleware'; // Assuming this is the exported function
import CustomerService from '@src/services/application/customer.service'; // Customer service

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('@src/services/application/customer.service');
// jest.mock('@src/connection/tenantDb'); // Only if getTenantDb is directly called in middleware

describe('Customer Auth Middleware - authenticateCustomer', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  // Mocks for external services/utils
  let mockJwtVerify: jest.Mock;
  let mockCustomerServiceGetCustomerById: jest.Mock;

  const customerId = 'customer-id-123';
  const tenantId = 'tenant-id-abc';
  const mockCustomer = {
    _id: customerId,
    tenantId: tenantId,
    name: 'Test Customer',
    email: 'customer@example.com',
    isActive: true, // Assuming an isActive field
    // toJSON: () => ({ _id: customerId, tenantId, name: 'Test Customer', isActive: true }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Express objects
    mockReq = {
      headers: {},
      params: {}, // For tenantId if passed in params
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Mock jwt.verify
    mockJwtVerify = jwt.verify as jest.Mock;

    // Mock CustomerService.getCustomerById
    mockCustomerServiceGetCustomerById = jest.fn();
    (CustomerService as any).getCustomerById = mockCustomerServiceGetCustomerById;
  });

  describe('Successful Authentication', () => {
    it('should authenticate customer and attach to req.customer if token and tenantId are valid, user exists and is active', async () => {
      mockReq.headers = { authorization: `Bearer valid-customer-token` };
      mockReq.params = { tenantId: tenantId }; // TenantId from request params
      const decodedPayload = { customerId: customerId, tenantId: tenantId, type: 'customer' };

      mockJwtVerify.mockReturnValue(decodedPayload);
      mockCustomerServiceGetCustomerById.mockResolvedValue(mockCustomer);

      await authenticateCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJwtVerify).toHaveBeenCalledWith('valid-customer-token', process.env.JWT_CUSTOMER_SECRET || 'default_customer_secret');
      expect(mockCustomerServiceGetCustomerById).toHaveBeenCalledWith(tenantId, customerId);
      expect((mockReq as any).customer).toBeDefined();
      expect((mockReq as any).customer._id).toEqual(customerId);
      expect((mockReq as any).tenantId).toEqual(tenantId); // Assuming middleware also sets this for downstream
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Failures due to Tenant ID', () => {
    it('should return 400 if tenantId is missing from request params', async () => {
      mockReq.headers = { authorization: `Bearer valid-customer-token` };
      // mockReq.params.tenantId is not set
      await authenticateCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400); // Bad Request
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Tenant ID is required.' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if tenantId in token does not match tenantId in request params', async () => {
      mockReq.headers = { authorization: `Bearer valid-customer-token` };
      mockReq.params = { tenantId: 'different-tenant-id' };
      const decodedPayload = { customerId: customerId, tenantId: tenantId, type: 'customer' }; // tenantId in token is 'tenant-id-abc'

      mockJwtVerify.mockReturnValue(decodedPayload);

      await authenticateCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403); // Forbidden
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token tenant ID does not match request tenant ID.' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Failures due to Token Issues', () => {
    beforeEach(() => {
        // Assume tenantId is correctly provided in params for these tests
        mockReq.params = { tenantId: tenantId };
    });

    it('should return 401 if no token is provided', async () => {
      await authenticateCustomer(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied. No token provided.' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token is malformed', async () => {
        mockReq.headers = { authorization: `NotBearer valid-token-string` };
        await authenticateCustomer(mockReq as Request, mockRes as Response, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied. Malformed token.' });
    });

    it('should return 401 if jwt.verify throws JsonWebTokenError', async () => {
      mockReq.headers = { authorization: `Bearer invalid-customer-token` };
      mockJwtVerify.mockImplementation(() => { throw new jwt.JsonWebTokenError('Invalid signature'); });
      await authenticateCustomer(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token.' });
    });

    it('should return 401 if jwt.verify throws TokenExpiredError', async () => {
      mockReq.headers = { authorization: `Bearer expired-customer-token` };
      mockJwtVerify.mockImplementation(() => { throw new jwt.TokenExpiredError('Token is expired', new Date()); });
      await authenticateCustomer(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token expired.' });
    });

    it('should return 401 if decoded token payload does not have customerId or tenantId', async () => {
        mockReq.headers = { authorization: `Bearer valid-token-missing-ids` };
        // Scenario 1: Missing customerId
        mockJwtVerify.mockReturnValue({ tenantId: tenantId, type: 'customer' });
        await authenticateCustomer(mockReq as Request, mockRes as Response, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token payload: Missing customerId or tenantId.' });

        // Scenario 2: Missing tenantId (though this is also checked against params)
        (mockRes.status as jest.Mock).mockClear(); // Clear previous calls to status/json
        (mockRes.json as jest.Mock).mockClear();
        mockJwtVerify.mockReturnValue({ customerId: customerId, type: 'customer' });
        await authenticateCustomer(mockReq as Request, mockRes as Response, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token payload: Missing customerId or tenantId.' });
    });

    it('should return 401 if decoded token payload type is not "customer"', async () => {
        mockReq.headers = { authorization: `Bearer valid-token-wrong-type` };
        mockJwtVerify.mockReturnValue({ customerId: customerId, tenantId: tenantId, type: 'platform_user' });
        await authenticateCustomer(mockReq as Request, mockRes as Response, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token type for customer access.' });
        expect(mockCustomerServiceGetCustomerById).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Failures due to Customer Status', () => {
    beforeEach(() => {
        mockReq.params = { tenantId: tenantId };
        mockReq.headers = { authorization: `Bearer valid-customer-token` };
        // Default valid token for these tests
        mockJwtVerify.mockReturnValue({ customerId: customerId, tenantId: tenantId, type: 'customer' });
    });

    it('should return 401 if customer from token is not found', async () => {
      mockCustomerServiceGetCustomerById.mockResolvedValue(null); // Customer not found
      await authenticateCustomer(mockReq as Request, mockRes as Response, mockNext);
      expect(mockCustomerServiceGetCustomerById).toHaveBeenCalledWith(tenantId, customerId);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authenticated customer not found.' });
    });

    it('should return 403 if customer is found but is inactive', async () => {
      const inactiveCustomer = { ...mockCustomer, isActive: false };
      mockCustomerServiceGetCustomerById.mockResolvedValue(inactiveCustomer);
      await authenticateCustomer(mockReq as Request, mockRes as Response, mockNext);
      expect(mockCustomerServiceGetCustomerById).toHaveBeenCalledWith(tenantId, customerId);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Customer account is inactive.' });
    });

    it('should call next(error) if CustomerService.getCustomerById fails unexpectedly', async () => {
        const dbError = new Error('Database error during customer fetch');
        mockCustomerServiceGetCustomerById.mockRejectedValue(dbError);
        await authenticateCustomer(mockReq as Request, mockRes as Response, mockNext);
        expect(mockCustomerServiceGetCustomerById).toHaveBeenCalledWith(tenantId, customerId);
        expect(mockNext).toHaveBeenCalledWith(dbError);
        expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
