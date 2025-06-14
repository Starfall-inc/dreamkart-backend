import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticatePlatformUser } from '@src/middleware/auth.middleware'; // Assuming this is the exported function
import PlatformUserService from '@src/services/platform/platformUser.service'; // User service used by middleware

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('@src/services/platform/platformUser.service');

describe('Auth Middleware - authenticatePlatformUser', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  // Mocks for external services/utils
  let mockJwtVerify: jest.Mock;
  let mockPlatformUserServiceGetUserById: jest.Mock;

  const platformUserId = 'platform-user-id-123';
  const mockPlatformUser = {
    _id: platformUserId,
    username: 'authtestuser',
    email: 'auth@example.com',
    isActive: true, // Assuming an isActive field
    roles: ['platform-admin'],
    toJSON: () => ({ _id: platformUserId, username: 'authtestuser', isActive: true, roles: ['platform-admin']}), // Ensure toJSON is also mocked if service returns model instances
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Express objects
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(), // For 'WWW-Authenticate' header
    };
    mockNext = jest.fn();

    // Mock jwt.verify
    mockJwtVerify = jwt.verify as jest.Mock;

    // Mock PlatformUserService.getUserById
    // Assuming PlatformUserService is a class with static methods or a singleton instance
    // If it's a class that's instantiated, the mocking approach would need to change.
    // For now, assuming it's like other services (singleton or static methods)
    mockPlatformUserServiceGetUserById = jest.fn();
    (PlatformUserService as any).getUserById = mockPlatformUserServiceGetUserById; // Or PlatformUserService.prototype.getUserById if it's a class instance method
  });

  describe('Successful Authentication', () => {
    it('should authenticate user and attach to req.platformUser if token is valid and user exists and is active', async () => {
      mockReq.headers = { authorization: `Bearer valid-token-string` };
      const decodedPayload = { userId: platformUserId, type: 'platform' }; // Assuming type is checked

      mockJwtVerify.mockReturnValue(decodedPayload);
      mockPlatformUserServiceGetUserById.mockResolvedValue(mockPlatformUser);

      await authenticatePlatformUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJwtVerify).toHaveBeenCalledWith('valid-token-string', process.env.JWT_PLATFORM_SECRET || 'default_platform_secret'); // Check secret
      expect(mockPlatformUserServiceGetUserById).toHaveBeenCalledWith(platformUserId); // No tenantId for platform service
      expect((mockReq as any).platformUser).toBeDefined();
      expect((mockReq as any).platformUser._id).toEqual(platformUserId);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(); // Called with no arguments
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Failures', () => {
    it('should return 401 if no token is provided', async () => {
      await authenticatePlatformUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied. No token provided.' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token is malformed (not Bearer)', async () => {
      mockReq.headers = { authorization: `NotBearer valid-token-string` };
      await authenticatePlatformUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied. Malformed token.' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if jwt.verify throws JsonWebTokenError (e.g. invalid signature)', async () => {
      mockReq.headers = { authorization: `Bearer invalid-token-string` };
      mockJwtVerify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid signature');
      });

      await authenticatePlatformUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token.' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if jwt.verify throws TokenExpiredError', async () => {
      mockReq.headers = { authorization: `Bearer expired-token-string` };
      mockJwtVerify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token is expired', new Date());
      });

      await authenticatePlatformUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token expired.' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if decoded token payload does not have userId', async () => {
        mockReq.headers = { authorization: `Bearer valid-token-no-userid` };
        const decodedPayload = { type: 'platform' }; // Missing userId
        mockJwtVerify.mockReturnValue(decodedPayload as any);

        await authenticatePlatformUser(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token payload: Missing userId.' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if decoded token payload type is not "platform" (if type checking is enforced)', async () => {
        // This test assumes the middleware specifically checks for `payload.type === 'platform'`
        mockReq.headers = { authorization: `Bearer valid-token-wrong-type` };
        const decodedPayload = { userId: platformUserId, type: 'application_user' };
        mockJwtVerify.mockReturnValue(decodedPayload);

        await authenticatePlatformUser(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401); // Or 403 depending on desired behavior
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token type for platform access.' });
        expect(mockPlatformUserServiceGetUserById).not.toHaveBeenCalled(); // Should fail before fetching user
        expect(mockNext).not.toHaveBeenCalled();
    });


    it('should return 401 if user from token is not found by PlatformUserService', async () => {
      mockReq.headers = { authorization: `Bearer valid-token-user-not-found` };
      const decodedPayload = { userId: 'non-existent-user-id', type: 'platform' };
      mockJwtVerify.mockReturnValue(decodedPayload);
      mockPlatformUserServiceGetUserById.mockResolvedValue(null); // User not found

      await authenticatePlatformUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPlatformUserServiceGetUserById).toHaveBeenCalledWith('non-existent-user-id');
      expect(mockRes.status).toHaveBeenCalledWith(401); // Or 403
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authenticated user not found.' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if user is found but is inactive', async () => {
      mockReq.headers = { authorization: `Bearer valid-token-inactive-user` };
      const decodedPayload = { userId: platformUserId, type: 'platform' };
      const inactiveUser = { ...mockPlatformUser, isActive: false };

      mockJwtVerify.mockReturnValue(decodedPayload);
      mockPlatformUserServiceGetUserById.mockResolvedValue(inactiveUser);

      await authenticatePlatformUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPlatformUserServiceGetUserById).toHaveBeenCalledWith(platformUserId);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User account is inactive.' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next(error) if PlatformUserService.getUserById fails unexpectedly', async () => {
        mockReq.headers = { authorization: `Bearer valid-token-string` };
        const decodedPayload = { userId: platformUserId, type: 'platform' };
        const dbError = new Error('Database connection error');

        mockJwtVerify.mockReturnValue(decodedPayload);
        mockPlatformUserServiceGetUserById.mockRejectedValue(dbError);

        await authenticatePlatformUser(mockReq as Request, mockRes as Response, mockNext);

        expect(mockPlatformUserServiceGetUserById).toHaveBeenCalledWith(platformUserId);
        expect(mockNext).toHaveBeenCalledWith(dbError); // Pass error to Express error handler
        expect(mockRes.status).not.toHaveBeenCalled(); // Error handler should deal with response
    });
  });
});
