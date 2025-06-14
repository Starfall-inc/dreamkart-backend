import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateTenantUser } from '@src/middleware/tenantUserAuth.middleware'; // Assuming this is the exported function
import UserService from '@src/services/application/user.service'; // Application UserService

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('@src/services/application/user.service');

describe('Tenant User Auth Middleware - authenticateTenantUser', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  // Mocks for external services/utils
  let mockJwtVerify: jest.Mock;
  let mockUserServiceGetUserById: jest.Mock;

  const userId = 'user-id-789';
  const tenantId = 'tenant-id-xyz';
  const mockTenantUser = {
    _id: userId,
    tenantId: tenantId, // Assuming user model might store tenantId, though UserService methods are scoped by it
    username: 'tenantemployee',
    email: 'employee@tenant.com',
    isActive: true,
    roles: ['editor'], // Example role
    // toJSON: () => ({ _id: userId, username: 'tenantemployee', isActive: true, roles: ['editor']}),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      headers: {},
      params: {}, // For tenantId if passed directly in route params
      // Or simulate tenant object from a preceding middleware:
      // tenant: { id: tenantId }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    mockJwtVerify = jwt.verify as jest.Mock;
    mockUserServiceGetUserById = jest.fn();
    (UserService as any).getUserById = mockUserServiceGetUserById;
  });

  // Helper to set tenantId in request (simulating it comes from params or prior middleware)
  const setRequestTenantId = (id: string | null) => {
    // Option 1: From params
    mockReq.params = id ? { tenantId: id } : {};
    // Option 2: From a `req.tenant` object (if a prior middleware sets it)
    // if (id) {
    //   (mockReq as any).tenant = { id: id };
    // } else {
    //   delete (mockReq as any).tenant;
    // }
  };


  describe('Successful Authentication', () => {
    it('should authenticate tenant user and attach to req.user if token and tenantId are valid, user exists and is active', async () => {
      setRequestTenantId(tenantId);
      mockReq.headers = { authorization: `Bearer valid-tenant-user-token` };
      const decodedPayload = { userId: userId, tenantId: tenantId, type: 'tenant-user' };

      mockJwtVerify.mockReturnValue(decodedPayload);
      mockUserServiceGetUserById.mockResolvedValue(mockTenantUser);

      await authenticateTenantUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJwtVerify).toHaveBeenCalledWith('valid-tenant-user-token', process.env.JWT_TENANT_USER_SECRET || 'default_tenant_user_secret');
      // UserService.getUserById is called with tenantId and userId
      expect(mockUserServiceGetUserById).toHaveBeenCalledWith(tenantId, userId);
      expect((mockReq as any).user).toBeDefined();
      expect((mockReq as any).user._id).toEqual(userId);
      expect((mockReq as any).tenantId).toEqual(tenantId); // Assuming middleware also sets this for convenience
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Failures due to Tenant ID', () => {
    it('should return 400 if tenantId is missing from request context', async () => {
      setRequestTenantId(null); // No tenantId in request
      mockReq.headers = { authorization: `Bearer valid-tenant-user-token` };

      await authenticateTenantUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Tenant ID is required for this operation.' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if tenantId in token does not match tenantId in request context', async () => {
      setRequestTenantId('different-tenant-id');
      mockReq.headers = { authorization: `Bearer valid-tenant-user-token` };
      // tenantId in token is 'tenant-id-xyz'
      const decodedPayload = { userId: userId, tenantId: tenantId, type: 'tenant-user' };

      mockJwtVerify.mockReturnValue(decodedPayload);

      await authenticateTenantUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token tenant ID does not match request context tenant ID.' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Failures due to Token Issues', () => {
    beforeEach(() => {
        setRequestTenantId(tenantId); // Assume tenantId is correctly provided for these tests
    });

    it('should return 401 if no token is provided', async () => {
      await authenticateTenantUser(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied. No token provided.' });
    });

    it('should return 401 if token is malformed', async () => {
        mockReq.headers = { authorization: `NotBearer valid-token-string` };
        await authenticateTenantUser(mockReq as Request, mockRes as Response, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied. Malformed token.' });
    });

    it('should return 401 if jwt.verify throws JsonWebTokenError', async () => {
      mockReq.headers = { authorization: `Bearer invalid-token` };
      mockJwtVerify.mockImplementation(() => { throw new jwt.JsonWebTokenError('Invalid signature'); });
      await authenticateTenantUser(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token.' });
    });

    it('should return 401 if jwt.verify throws TokenExpiredError', async () => {
      mockReq.headers = { authorization: `Bearer expired-token` };
      mockJwtVerify.mockImplementation(() => { throw new jwt.TokenExpiredError('Token is expired', new Date()); });
      await authenticateTenantUser(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token expired.' });
    });

    it('should return 401 if decoded token payload does not have userId or tenantId', async () => {
        mockReq.headers = { authorization: `Bearer valid-token-missing-ids` };
        mockJwtVerify.mockReturnValue({ type: 'tenant-user' }); // Missing userId and tenantId
        await authenticateTenantUser(mockReq as Request, mockRes as Response, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token payload: Missing userId or tenantId.' });
    });

    it('should return 401 if decoded token payload type is not "tenant-user"', async () => {
        mockReq.headers = { authorization: `Bearer valid-token-wrong-type` };
        mockJwtVerify.mockReturnValue({ userId: userId, tenantId: tenantId, type: 'customer' });
        await authenticateTenantUser(mockReq as Request, mockRes as Response, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token type for tenant user access.' });
        expect(mockUserServiceGetUserById).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Failures due to User Status', () => {
    beforeEach(() => {
        setRequestTenantId(tenantId);
        mockReq.headers = { authorization: `Bearer valid-tenant-user-token` };
        mockJwtVerify.mockReturnValue({ userId: userId, tenantId: tenantId, type: 'tenant-user' });
    });

    it('should return 401 if user from token is not found in the specified tenant', async () => {
      mockUserServiceGetUserById.mockResolvedValue(null);
      await authenticateTenantUser(mockReq as Request, mockRes as Response, mockNext);
      expect(mockUserServiceGetUserById).toHaveBeenCalledWith(tenantId, userId);
      expect(mockRes.status).toHaveBeenCalledWith(401); // Or 403
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authenticated tenant user not found.' });
    });

    it('should return 403 if user is found but is inactive', async () => {
      const inactiveUser = { ...mockTenantUser, isActive: false };
      mockUserServiceGetUserById.mockResolvedValue(inactiveUser);
      await authenticateTenantUser(mockReq as Request, mockRes as Response, mockNext);
      expect(mockUserServiceGetUserById).toHaveBeenCalledWith(tenantId, userId);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Tenant user account is inactive.' });
    });

    // Optional: Add role checks if middleware supports it
    // it('should return 403 if user does not have required role', async () => { ... });

    it('should call next(error) if UserService.getUserById fails unexpectedly', async () => {
        const dbError = new Error('Database error during tenant user fetch');
        mockUserServiceGetUserById.mockRejectedValue(dbError);
        await authenticateTenantUser(mockReq as Request, mockRes as Response, mockNext);
        expect(mockUserServiceGetUserById).toHaveBeenCalledWith(tenantId, userId);
        expect(mockNext).toHaveBeenCalledWith(dbError);
        expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
