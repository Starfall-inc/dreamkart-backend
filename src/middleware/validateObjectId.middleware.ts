// src/middleware/validateObjectId.middleware.ts
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

const validateObjectId = (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params; // Or whatever param name you are validating

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: 'Invalid Product ID format, my dear! 🧐' });
    }
    next(); // ID is valid, proceed to the next middleware/route handler
};

export { validateObjectId };