import mongoose from 'mongoose'; // May or may not be used directly by service, but good for ObjectIds
import PlatformUserService from '@src/services/platform/platformUser.service';
import PlatformUserModel, { IPlatformUser } from '@src/model/platform/platformUser.model'; // Assuming model is imported directly
import * as PasswordUtils from '@src/utils/password.utils';

// Mock dependencies
jest.mock('@src/model/platform/platformUser.model'); // Mock the entire model module
jest.mock('@src/utils/password.utils');

describe('PlatformUserService', () => {
  // Mocks for PlatformUserModel methods
  let mockUserSave: jest.Mock;
  let mockUserFind: jest.Mock;
  let mockUserFindById: jest.Mock;
  let mockUserFindOne: jest.Mock; // For checking existence by email/username
  let mockUserFindOneAndUpdate: jest.Mock;
  let mockUserFindByIdAndDelete: jest.Mock;

  // Mocks for PasswordUtils
  let mockHashPassword: jest.Mock;

  const userObjectId = new mongoose.Types.ObjectId();
  const hashedPassword = 'platform_hashed_password_string';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock functions that would be static methods on PlatformUserModel or instance methods
    mockUserSave = jest.fn();
    mockUserFind = jest.fn();
    mockUserFindById = jest.fn();
    mockUserFindOne = jest.fn(); // Used for checking duplicates typically
    mockUserFindOneAndUpdate = jest.fn();
    mockUserFindByIdAndDelete = jest.fn();

    // Configure the default mock implementation for PlatformUserModel
    PlatformUserModel.find = mockUserFind;
    PlatformUserModel.findById = mockUserFindById;
    PlatformUserModel.findOne = mockUserFindOne;
    PlatformUserModel.findOneAndUpdate = mockUserFindOneAndUpdate;
    PlatformUserModel.findByIdAndDelete = mockUserFindByIdAndDelete;

    // Mock the constructor of PlatformUserModel to return instances that have a save method
    // and toJSON/toObject for password exclusion
    (PlatformUserModel as unknown as jest.Mock).mockImplementation((data: any) => {
      const instance = {
        ...data,
        _id: data._id || new mongoose.Types.ObjectId(),
        save: mockUserSave,
        toJSON: jest.fn().mockImplementation(function(this: any) {
          const { password, ...obj } = this; // Exclude password
          return obj;
        }),
        toObject: jest.fn().mockImplementation(function(this: any) {
          const { password, ...obj } = this; // Exclude password
          return obj;
        }),
      };
      return instance;
    });

    // Default behavior for save (returns the instance, which will then be processed by toJSON/toObject by service)
    mockUserSave.mockImplementation(async function(this: any) { return this; });
    // Default behavior for findOne (e.g. no user found by default for pre-checks)
    mockUserFindOne.mockResolvedValue(null);


    // Mock PasswordUtils
    mockHashPassword = PasswordUtils.hashPassword as jest.Mock;
    mockHashPassword.mockResolvedValue(hashedPassword);
  });

  // PlatformUserService is likely a singleton instance
  const platformUserService = PlatformUserService;

  describe('createUser', () => {
    const userData: Omit<IPlatformUser, '_id' | 'createdAt' | 'updatedAt'> = {
      username: 'platformadmin',
      email: 'admin@platform.com',
      password: 'plain_password123',
      firstName: 'Platform',
      lastName: 'Admin',
      roles: ['platform-admin'],
    };

    it('should hash password, check for existing user, and create a user successfully', async () => {
      mockUserFindOne.mockResolvedValue(null); // No existing user with same email/username

      // The constructor mock will be called, then instance.save()
      // mockUserSave.mockResolvedValue({ ...userData, _id: userObjectId, password: hashedPassword }); // save returns the doc with hashed pass

      const result = await platformUserService.createUser(userData);

      expect(mockHashPassword).toHaveBeenCalledWith(userData.password);
      expect(PlatformUserModel.findOne).toHaveBeenCalledWith({ // Or whatever query service uses to check existing
        $or: [{ email: userData.email }, { username: userData.username }]
      });
      expect(PlatformUserModel).toHaveBeenCalledWith({ // constructor check
        ...userData,
        password: hashedPassword,
      });
      expect(mockUserSave).toHaveBeenCalledTimes(1);

      // Result should have password excluded by toJSON
      expect(result.username).toBe(userData.username);
      expect(result.password).toBeUndefined();
    });

    it('should throw an error if email or username already exists', async () => {
      mockUserFindOne.mockResolvedValue({ email: userData.email, username: 'someotheruser' }); // Simulate user exists

      await expect(platformUserService.createUser(userData))
        .rejects.toThrow('User with this email or username already exists.'); // Or similar error
      expect(mockHashPassword).not.toHaveBeenCalled(); // Should check before hashing
      expect(PlatformUserModel).not.toHaveBeenCalledWith(expect.objectContaining({password: expect.any(String)}));
      expect(mockUserSave).not.toHaveBeenCalled();
    });

    it('should throw an error if password hashing fails', async () => {
        mockUserFindOne.mockResolvedValue(null); // No existing user
        const hashError = new Error('Hashing failed catastrophically');
        mockHashPassword.mockRejectedValue(hashError);

        await expect(platformUserService.createUser(userData))
            .rejects.toThrow(hashError);
        expect(mockUserSave).not.toHaveBeenCalled();
    });

    it('should throw an error if user creation (save) fails', async () => {
      mockUserFindOne.mockResolvedValue(null); // No existing user
      const saveError = new Error('Database save failed');
      mockUserSave.mockRejectedValue(saveError);
      // Constructor will be called, then save will fail

      await expect(platformUserService.createUser(userData))
        .rejects.toThrow(saveError);
      expect(mockHashPassword).toHaveBeenCalledWith(userData.password); // Hashing happens before save
      expect(PlatformUserModel).toHaveBeenCalledTimes(1); // Constructor called
      expect(mockUserSave).toHaveBeenCalledTimes(1); // Save attempted
    });
  });

  describe('getUsers', () => {
    it('should return a list of users (passwords excluded)', async () => {
      const usersFromDb = [
        { username: 'user1', password: 'hashed_password1', toJSON: () => ({username: 'user1'}) },
        { username: 'user2', password: 'hashed_password2', toJSON: () => ({username: 'user2'}) },
      ];
      // PlatformUserModel.find().select('-password').exec() is common
      const mockExec = jest.fn().mockResolvedValue(usersFromDb.map(u => u.toJSON())); // toJSON applied by service or model
      const mockSelect = jest.fn().mockReturnValue({ exec: mockExec });
      mockUserFind.mockReturnValue({ select: mockSelect } as any);


      const result = await platformUserService.getUsers({}); // Assuming empty filter for all users

      expect(PlatformUserModel.find).toHaveBeenCalledWith({});
      // expect(mockSelect).toHaveBeenCalledWith('-password'); // If service explicitly selects
      // expect(mockExec).toHaveBeenCalled();
      expect(result.every(user => (user as any).password === undefined)).toBe(true);
      expect(result).toEqual([{username: 'user1'}, {username: 'user2'}]);
    });
  });

  describe('getUserById', () => {
    it('should return a user if found (password excluded)', async () => {
      const userId = userObjectId.toString();
      const userFromDb = { _id: userId, username: 'platformUser', password: hashedPassword, toJSON: () => ({_id: userId, username: 'platformUser'}) };

      const mockExec = jest.fn().mockResolvedValue(userFromDb.toJSON());
      const mockSelect = jest.fn().mockReturnValue({ exec: mockExec });
      mockUserFindById.mockReturnValue({ select: mockSelect } as any);


      const result = await platformUserService.getUserById(userId);

      expect(PlatformUserModel.findById).toHaveBeenCalledWith(userId);
      // expect(mockSelect).toHaveBeenCalledWith('-password');
      // expect(mockExec).toHaveBeenCalled();
      expect((result as any).password).toBeUndefined();
      expect(result.username).toBe('platformUser');
    });

    it('should throw an error if user not found by ID', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const mockExec = jest.fn().mockResolvedValue(null);
      const mockSelect = jest.fn().mockReturnValue({ exec: mockExec });
      mockUserFindById.mockReturnValue({ select: mockSelect } as any);


      await expect(platformUserService.getUserById(userId))
          .rejects.toThrow(`Platform user with id ${userId} not found.`); // Or similar error
    });
  });

  describe('updateUser', () => {
    const userId = userObjectId.toString();
    const updateData: Partial<IPlatformUser> = { username: 'updatedPlatformUser' };
    const updateDataWithPassword: Partial<IPlatformUser> = { username: 'updatedUserPass', password: 'new_plain_password321' };

    it('should update user details successfully without password change', async () => {
      const updatedUserDoc = { _id: userId, username: 'updatedPlatformUser', toJSON: () => ({_id: userId, username: 'updatedPlatformUser'}) };
      mockUserFindOneAndUpdate.mockResolvedValue(updatedUserDoc);

      const result = await platformUserService.updateUser(userId, updateData);

      expect(PlatformUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: userId },
        { $set: updateData },
        { new: true, runValidators: true }
      );
      expect(mockHashPassword).not.toHaveBeenCalled();
      expect(result.username).toBe('updatedPlatformUser');
      expect((result as any).password).toBeUndefined();
    });

    it('should hash new password and update user if password is provided and not empty', async () => {
      const expectedPayloadAfterHash = { username: updateDataWithPassword.username, password: hashedPassword };
      const updatedUserDoc = { _id: userId, ...expectedPayloadAfterHash, toJSON: () => ({_id: userId, username: expectedPayloadAfterHash.username}) };
      mockUserFindOneAndUpdate.mockResolvedValue(updatedUserDoc);

      const result = await platformUserService.updateUser(userId, updateDataWithPassword);

      expect(mockHashPassword).toHaveBeenCalledWith(updateDataWithPassword.password);
      expect(PlatformUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: userId },
        { $set: expectedPayloadAfterHash },
        { new: true, runValidators: true }
      );
      expect(result.username).toBe(expectedPayloadAfterHash.username);
      expect((result as any).password).toBeUndefined();
    });

    it('should not update password if password field is an empty string', async () => {
        const updateWithEmptyPass: Partial<IPlatformUser> = { username: 'userWithEmptyPass', password: '' };
        const expectedPayload = { username: 'userWithEmptyPass' }; // Service should strip empty password
        const updatedUserDoc = { _id: userId, ...expectedPayload, toJSON: () => ({_id: userId, username: expectedPayload.username}) };
        mockUserFindOneAndUpdate.mockResolvedValue(updatedUserDoc);

        await platformUserService.updateUser(userId, updateWithEmptyPass);

        expect(mockHashPassword).not.toHaveBeenCalled();
        expect(PlatformUserModel.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: userId },
            { $set: expectedPayload },
            { new: true, runValidators: true }
        );
    });


    it('should throw an error if user to update is not found', async () => {
      mockUserFindOneAndUpdate.mockResolvedValue(null);

      await expect(platformUserService.updateUser(userId, updateData))
          .rejects.toThrow(`Platform user with ID '${userId}' not found for update.`); // Or similar error
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      const userId = userObjectId.toString();
      const deletedUserDoc = { _id: userId, username: 'deletedPlatformUser', toJSON: () => ({_id: userId, username: 'deletedPlatformUser'}) };
      mockUserFindByIdAndDelete.mockResolvedValue(deletedUserDoc);

      const result = await platformUserService.deleteUser(userId);

      expect(PlatformUserModel.findByIdAndDelete).toHaveBeenCalledWith(userId);
      expect(result.username).toBe('deletedPlatformUser');
      expect((result as any).password).toBeUndefined();
    });

    it('should throw an error if user to delete is not found', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      mockUserFindByIdAndDelete.mockResolvedValue(null);

      await expect(platformUserService.deleteUser(userId))
        .rejects.toThrow(`Platform user with ID '${userId}' not found for deletion.`); // Or similar error
    });
  });
});
