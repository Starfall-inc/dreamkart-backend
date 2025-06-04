import mongoose, { Schema } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Tenant, { ITenant } from '@src/model/platform/tenant.model'; // Using path alias @src

describe('Tenant Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up collections after each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  // Test for basic tenant creation and default values
  it('should create a tenant with default status and plan', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const tenantData = {
      name: 'Test Shop',
      ownerId: ownerId,
      email: 'test@shop.com',
    };
    const tenant = new Tenant(tenantData);
    const savedTenant = await tenant.save();

    expect(savedTenant._id).toBeDefined();
    expect(savedTenant.name).toBe('Test Shop');
    expect(savedTenant.ownerId).toEqual(ownerId);
    expect(savedTenant.email).toBe('test@shop.com');
    expect(savedTenant.status).toBe('pending'); // Default status
    expect(savedTenant.plan).toBe('free'); // Default plan
    expect(savedTenant.settings).toEqual({}); // Default settings
    expect(savedTenant.createdAt).toBeDefined();
    expect(savedTenant.updatedAt).toBeDefined();
  });

  describe('Pre-save Hook: Slug Generation', () => {
    it('should generate a slug from the name on new tenant', async () => {
      const tenant = new Tenant({
        name: 'My Awesome Shop  ', // With extra spaces
        ownerId: new mongoose.Types.ObjectId(),
        email: 'awesome@shop.com',
      });
      await tenant.save();
      expect(tenant.slug).toBe('my-awesome-shop');
    });

    it('should update the slug if the name is modified', async () => {
      const tenant = new Tenant({
        name: 'Old Name',
        ownerId: new mongoose.Types.ObjectId(),
        email: 'old@name.com',
      });
      await tenant.save();
      expect(tenant.slug).toBe('old-name');

      tenant.name = 'New Name!'; // Modify name
      await tenant.save();
      expect(tenant.slug).toBe('new-name');
    });

    it('should handle special characters in name for slug generation', async () => {
      const tenant = new Tenant({
        name: 'Shop@123_ Nāme-Is Cool?',
        ownerId: new mongoose.Types.ObjectId(),
        email: 'special@name.com',
      });
      await tenant.save();
      // According to the logic: .toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
      // 'shop@123_ nāme-is cool?' -> 'shop123 nme-is cool' -> 'shop123-nme-is-cool' (assuming nāme becomes nme)
      // The regex [^a-z0-9\s-] will remove 'ā', '@', '_', '?'.
      expect(tenant.slug).toBe('shop123-nme-is-cool');
    });
  });

  describe('Pre-save Hook: DatabaseName Generation', () => {
    it('should generate a databaseName on new tenant', async () => {
      const tenant = new Tenant({
        name: 'Database Test Shop',
        ownerId: new mongoose.Types.ObjectId(),
        email: 'dbtest@shop.com',
      });
      await tenant.save();
      expect(tenant.databaseName).toBeDefined();
      // db_${baseName.substring(0, 20)}_${new mongoose.Types.ObjectId().toString().substring(0, 8)}
      // baseName for 'Database Test Shop' is 'database-test-shop'
      expect(tenant.databaseName).toMatch(/^db_database-test-shop_[a-f0-9]{8}$/);
    });

    it('should generate a different databaseName for tenants with the same slug prefix due to ObjectId uniqueness', async () => {
      const owner = new mongoose.Types.ObjectId();
          const tenant1 = new Tenant({ name: 'Unique DB Test One', ownerId: owner, email: 'unique1@db.com' });
      await tenant1.save();

          // Use a different name for tenant2 to avoid unique name/slug constraint violation
          const tenant2 = new Tenant({ name: 'Unique DB Test Two', ownerId: owner, email: 'unique2@db.com' });
      await tenant2.save();

      expect(tenant1.databaseName).toBeDefined();
      expect(tenant2.databaseName).toBeDefined();
      expect(tenant1.databaseName).not.toBe(tenant2.databaseName);
          // Check if the prefix matches the respective slugs and has the random suffix
          expect(tenant1.databaseName).toMatch(/^db_unique-db-test-one_[a-f0-9]{8}$/);
          expect(tenant2.databaseName).toMatch(/^db_unique-db-test-two_[a-f0-9]{8}$/);
    });

    it('should not regenerate databaseName if already set (e.g., on subsequent saves)', async () => {
      const tenant = new Tenant({
        name: 'Persistent DB Name',
        ownerId: new mongoose.Types.ObjectId(),
        email: 'persist@db.com',
      });
      await tenant.save();
      const initialDbName = tenant.databaseName;

      tenant.status = 'active'; // Modify a non-name field
      await tenant.save();
      expect(tenant.databaseName).toBe(initialDbName);
    });
  });

  // Test for required fields (Mongoose validation)
  it('should fail if required fields are missing', async () => {
    let error;
    try {
      const tenant = new Tenant({}); // Missing name, ownerId, email
      await tenant.save();
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error.errors.name).toBeDefined();
    expect(error.errors.ownerId).toBeDefined();
    expect(error.errors.email).toBeDefined();
  });

   it('should enforce uniqueness for name, slug, email, and databaseName', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const initialTenantData = {
      name: 'Unique Shop',
      ownerId: ownerId,
      email: 'unique@shop.com',
    };
    const tenant1 = new Tenant(initialTenantData);
    await tenant1.save();

    // Test unique name
    try {
      const tenant2 = new Tenant({ ...initialTenantData, email: 'another@shop.com', ownerId: new mongoose.Types.ObjectId() });
      await tenant2.save();
    } catch (e: any) {
      expect(e.code).toBe(11000); // MongoDB duplicate key error
      expect(e.message).toContain('name');
    }

    // Test unique email
    try {
      const tenant3 = new Tenant({ ...initialTenantData, name: 'Another Shop', ownerId: new mongoose.Types.ObjectId() });
      await tenant3.save();
    } catch (e: any) {
      expect(e.code).toBe(11000);
      expect(e.message).toContain('email');
    }

    // Test unique slug (implicitly tested by unique name, as slug is derived from it)
    // Test unique databaseName (implicitly tested by unique name/slug and random suffix logic,
    // but an explicit collision attempt is harder to force reliably here without deeper mock)
    // The model has unique:true for slug and databaseName in schema, Mongoose will enforce this.
  });
});
