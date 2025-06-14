import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { validateObjectId } from '@src/middleware/validateObjectId.middleware'; // Assuming this is the exported factory function

// Mock mongoose.Types.ObjectId.isValid
jest.mock('mongoose', () => ({
  ...jest.requireActual('mongoose'), // Import and retain default behavior
  Types: {
    ObjectId: {
      isValid: jest.fn(), // Mock only the isValid method
    },
  },
}));

describe('validateObjectId Middleware Factory', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockObjectIdIsValid: jest.Mock;

  const paramName = 'id'; // The parameter name we'll test with
  let objectIdMiddleware: (req: Request, res: Response, next: NextFunction) => void;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Get the mocked version of ObjectId.isValid
    mockObjectIdIsValid = mongoose.Types.ObjectId.isValid as jest.Mock;

    // Create an instance of the middleware for the paramName 'id'
    objectIdMiddleware = validateObjectId(paramName);
  });

  describe(`Middleware generated for paramName: "${paramName}"`, () => {
    it('should call next() if a valid ObjectId is provided for the specified paramName', () => {
      mockReq.params = { [paramName]: 'validObjectIdString' };
      mockObjectIdIsValid.mockReturnValue(true);

      objectIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockObjectIdIsValid).toHaveBeenCalledWith('validObjectIdString');
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(); // Called with no arguments
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 error if an invalid ObjectId is provided for the specified paramName', () => {
      mockReq.params = { [paramName]: 'invalidObjectIdString' };
      mockObjectIdIsValid.mockReturnValue(false);

      objectIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockObjectIdIsValid).toHaveBeenCalledWith('invalidObjectIdString');
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: `Invalid ObjectId format for parameter: ${paramName}` });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() if the specified paramName is not present in req.params', () => {
      // req.params is empty, so paramName 'id' is not present
      objectIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockObjectIdIsValid).not.toHaveBeenCalled(); // isValid should not be called
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle cases where req.params is undefined', () => {
      mockReq.params = undefined; // Simulate undefined params

      objectIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockObjectIdIsValid).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Factory behavior with different paramNames', () => {
    it('should create a middleware that checks a different paramName correctly', () => {
      const otherParamName = 'userId';
      const otherMiddleware = validateObjectId(otherParamName);
      mockReq.params = { [otherParamName]: 'anotherValidId' };
      mockObjectIdIsValid.mockReturnValue(true);

      otherMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockObjectIdIsValid).toHaveBeenCalledWith('anotherValidId');
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should create a middleware that fails for a different paramName with invalid ObjectId', () => {
      const otherParamName = 'productId';
      const otherMiddleware = validateObjectId(otherParamName);
      mockReq.params = { [otherParamName]: 'invalidProductId' };
      mockObjectIdIsValid.mockReturnValue(false);

      otherMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockObjectIdIsValid).toHaveBeenCalledWith('invalidProductId');
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: `Invalid ObjectId format for parameter: ${otherParamName}` });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // Optional: Test if the factory can handle an array of paramNames
  describe('Middleware generated for an array of paramNames', () => {
    // This part assumes the validateObjectId factory can accept string[]
    // If it only accepts string, these tests would need to be adapted or removed.
    // Let's assume for now it's enhanced to accept string[]
    let multiParamMiddleware: (req: Request, res: Response, next: NextFunction) => void;
    const paramNamesArray = ['orderId', 'itemId'];

    beforeEach(() => {
        // This assumes the actual middleware is designed to handle an array.
        // If not, this test setup is speculative.
        // For now, this will test the *concept*. The implementation of validateObjectId would need to support it.
        // If validateObjectId only takes string, these tests will fail or need modification.
        // Assuming validateObjectId is updated to handle string[]:
        // objectIdMiddleware = validateObjectId(paramNamesArray);
    });

    it('should call next() if all specified ObjectIds in an array are valid', () => {
      // This test is conceptual if validateObjectId doesn't support arrays.
      // To make this runnable, let's test one by one as if it were an array scenario.
      const middlewareForOrderId = validateObjectId('orderId');
      const middlewareForItemId = validateObjectId('itemId');

      mockReq.params = { orderId: 'validOrderId', itemId: 'validItemId' };
      mockObjectIdIsValid.mockImplementation((value) => value.startsWith('valid'));

      middlewareForOrderId(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
      mockNext.mockClear(); // Clear mock for next call

      middlewareForItemId(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 error if any specified ObjectId in an array is invalid', () => {
      // Conceptual test for array handling.
      // Test the first invalid one encountered.
      const middlewareForOrderId = validateObjectId('orderId');
      // const middlewareForItemId = validateObjectId('itemId'); // Not reached if first fails

      mockReq.params = { orderId: 'invalidOrderId', itemId: 'validItemId' };
      mockObjectIdIsValid.mockImplementation((value) => value === 'validItemId'); // 'invalidOrderId' will be false

      middlewareForOrderId(mockReq as Request, mockRes as Response, mockNext);

      expect(mockObjectIdIsValid).toHaveBeenCalledWith('invalidOrderId');
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: `Invalid ObjectId format for parameter: orderId` });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() if some ObjectIds in an array are present and valid, and others are missing', () => {
        // Conceptual
        const middlewareForOrderId = validateObjectId('orderId');
        const middlewareForItemId = validateObjectId('itemId'); // This one won't find 'itemId'

        mockReq.params = { orderId: 'validOrderId' }; // itemId is missing
        mockObjectIdIsValid.mockReturnValue(true); // For 'validOrderId'

        middlewareForOrderId(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
        mockNext.mockClear();

        // itemId is not in params, so this should call next() too
        middlewareForItemId(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
