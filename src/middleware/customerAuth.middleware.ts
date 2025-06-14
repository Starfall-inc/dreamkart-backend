// src/middleware/customerAuth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Request interface to include customer and tenantDbName
declare global {
  namespace Express {
    interface Request {
      customer?: { id: string; email: string; tenantDbName: string };
      tenantDbName?: string; // Also add tenantDbName here for consistency
    }
  }
}

const customerSecret = process.env.CUSTOMER_JWT_SECRET || 'yourCustomerJwtSecret'; // Match the secret used in customer login route

export const authenticateCustomer = (req: Request, res: Response, next: NextFunction) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No customer token provided or invalid format. Please log in, sweetie! 🥺' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, customerSecret) as { id: string; email: string; isCustomer: boolean; tenantDbName: string; iat: number; exp: number };

    // Check if it's explicitly a customer token
    if (!decoded.isCustomer) {
      return res.status(403).json({ message: 'Access denied. This token is not for a customer, my dear! 🚫' });
    }

    // Attach customer info and tenantDbName to the request
    req.customer = { id: decoded.id, email: decoded.email, tenantDbName: decoded.tenantDbName };
    req.tenantDbName = decoded.tenantDbName; // Make tenantDbName available via req.tenantDbName too

    next(); // Proceed to the next middleware/route handler
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Customer token expired. Please log in again! 🕒' });
    }
    console.error('Error verifying customer token:', error);
    res.status(401).json({ message: 'Invalid customer token. You are not authorized! 💔' });
  }
};