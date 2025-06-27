import { Request, Response, NextFunction } from 'express';
import tenantService from '../services/platform/tenant.service';

declare global {
  namespace Express {
    interface Request {
      tenantDbName?: string;
      tenantSlug?: string;
    }
  }
}

export const tenantResolver = async (req: Request, res: Response, next: NextFunction) => {
  const tenantSlug = req.headers['x-tenant-id'];

  if (!tenantSlug || typeof tenantSlug !== 'string') {
    return res.status(400).json({ message: 'X-Tenant-ID (slug) is missing! 🥺' });
  }

  try {
    const tenant = await tenantService.getTenantBySlug(tenantSlug);

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found with that slug! 😞' });
    }

    const tenantDbName = tenant.databaseName; // "db_devmart_685af56e"

    res.locals.tenantDbName = tenantDbName;
    req.tenantSlug = tenantSlug;
    next();
  } catch (error: any) {
    console.error(`Error resolving tenant '${tenantSlug}':`, error);
    return res.status(500).json({ message: 'Internal server error while resolving tenant.', error: error.message });
  }
};
export default tenantResolver;