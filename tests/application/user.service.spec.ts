import mongoose from 'mongoose';
import UserService from '@src/services/application/user.service';
import { IUser } from '@src/model/application/user.model'; // For type
import UserModelSchema from '@src/model/application/user.model'; // Import the actual model for schema access
import * as TenantDbConnection from '@src/connection/tenantDb';
import * as PasswordUtils from '@src/utils/password.utils'; // Assuming path to password utils

// Mock dependencies
jest.mock('@src/connection/tenantDb');
jest.mock('@src/utils/password.utils'); // Mock password hashing utilities

describe('UserService (Application Level)', () => {
  let mockGetTenantDb: jest.Mock;
  let mockTenantDbInstance: any;

  // Mocks for UserModel
  let mockUserModel: any;
  let mockUserSave: jest.Mock;
  let mockUserFind: jest.Mock;
  let mockUserFindById: jest.Mock;
  let mockUserFindOneAndUpdate: jest.Mock;
  let mockUserFindByIdAndDelete: jest.Mock;

  // Mocks for PasswordUtils
  let mockHashPassword: jest.Mock;

  const tenantDbName = 'test_tenant_db_for_user_service';
  const userObjectId = new mongoose.Types.ObjectId();
  const hashedPassword = 'hashed_password_string';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock functions for UserModel methods
    mockUserSave = jest.fn();
    mockUserFind = jest.fn();
    mockUserFindById = jest.fn();
    mockUserFindOneAndUpdate = jest.fn();
    mockUserFindByIdAndDelete = jest.fn();

    // Mock UserModel constructor
    mockUserModel = jest.fn().mockImplementation((data?: any) => ({
      ...data,
      _id: data?._id || new mongoose.Types.ObjectId(),
      save: mockUserSave,
      // Simulate Mongoose toJSON/toObject behavior for hiding password
      toJSON: jest.fn().mockImplementation(function(this: any) {
        const obj = { ...this };
        delete obj.password;
        return obj;
      }),
      toObject: jest.fn().mockImplementation(function(this: any) {
        const obj = { ...this };
        delete obj.password;
        return obj;
      }),
    }));

    // Attach static methods to the mock UserModel constructor
    mockUserModel.find = mockUserFind;
    mockUserModel.findById = mockUserFindById;
    mockUserModel.findOneAndUpdate = mockUserFindOneAndUpdate;
    mockUserModel.findByIdAndDelete = mockUserFindByIdAndDelete;
    mockUserModel.schema = UserModelSchema.schema;

    // Mock PasswordUtils
    mockHashPassword = PasswordUtils.hashPassword as jest.Mock;
    mockHashPassword.mockResolvedValue(hashedPassword); // Default mock for hashPassword

    // Default behavior for save, can be overridden in tests
    mockUserSave.mockImplementation(async function(this: any) {
        // Simulate that the actual save operation would return a document
        // that also has toJSON/toObject to hide password
        const savedDoc = { ...this };
        // delete savedDoc.password; // Password should be in the saved doc, but hidden on toJSON
        return savedDoc;
    });


    mockTenantDbInstance = {
      model: jest.fn().mockImplementation((modelName: string) => {
        if (modelName === 'User') {
          return mockUserModel;
        }
        const GenericMockModel = jest.fn((data?: any) => ({ ...data, save: jest.fn().mockResolvedValue(data) }));
        GenericMockModel.find = jest.fn().mockResolvedValue([]);
        GenericMockModel.findById = jest.fn().mockResolvedValue(null);
        GenericMockModel.schema = new mongoose.Schema({});
        return GenericMockModel;
      }),
    };

    mockGetTenantDb = TenantDbConnection.getTenantDb as jest.Mock;
    mockGetTenantDb.mockReturnValue(mockTenantDbInstance);
  });

  // UserService is imported as an instance (singleton)
  const userService = UserService;

  describe('createUser', () => {
    const userData: Omit<IUser, '_id' | 'createdAt' | 'updatedAt'> = {
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'plain_password',
      firstName: 'Test',
      lastName: 'User',
      roles: ['user'],
    };

    it('should hash the password and create a user successfully', async () => {
      const instanceId = new mongoose.Types.ObjectId();
      const mockInstanceReturnedByConstructor = {
        ...userData,
        _id: instanceId,
        password: hashedPassword, // Important: password should be the hashed one
        save: mockUserSave,
        toJSON: jest.fn().mockReturnValue({ ...userData, _id: instanceId, password: hashedPassword }), // Simplified for checking result
      };
      (mockUserModel as jest.Mock).mockReturnValue(mockInstanceReturnedByConstructor);
      // mockUserSave.mockResolvedValue(mockInstanceReturnedByConstructor);
       mockUserSave.mockImplementation(async function(this: any) { return this; });


      const result = await userService.createUser(tenantDbName, userData);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('User', UserModelSchema.schema);
      expect(mockHashPassword).toHaveBeenCalledWith(userData.password);
      expect(mockUserModel).toHaveBeenCalledWith({
        ...userData,
        password: hashedPassword, // Ensure hashed password was used for model creation
      });
      expect(mockUserSave).toHaveBeenCalledTimes(1);
      // The result from service might have password excluded by toJSON by default
      expect(result.username).toBe(userData.username);
      expect(result.password).toBe(hashedPassword); // Assuming service returns the full object before toJSON for some reason, or we check the saved object
    });

    it('should throw an error if password hashing fails', async () => {
      const hashError = new Error('Hashing failed');
      mockHashPassword.mockRejectedValue(hashError);

      await expect(userService.createUser(tenantDbName, userData))
        .rejects.toThrow(hashError);
      expect(mockUserModel).not.toHaveBeenCalled();
      expect(mockUserSave).not.toHaveBeenCalled();
    });

    it('should throw an error if user creation fails (database error)', async () => {
      const saveError = new Error('Failed to save user');
      (mockUserModel as jest.Mock).mockImplementation((data?: any) => ({
        ...data,
        save: mockUserSave.mockRejectedValue(saveError),
      }));

      await expect(userService.createUser(tenantDbName, userData))
        .rejects.toThrow(saveError);
      expect(mockHashPassword).toHaveBeenCalledWith(userData.password); // Hashing occurs before save attempt
    });
  });

  describe('getUsers', () => {
    it('should return a list of users (passwords excluded or handled by toJSON)', async () => {
      const usersFromDb = [
        { username: 'user1', password: 'hashed_password1', toJSON: () => ({username: 'user1'}) },
        { username: 'user2', password: 'hashed_password2', toJSON: () => ({username: 'user2'}) },
      ];
      mockUserFind.mockReturnValue({
        select: jest.fn().mockReturnThis(), // Mock select if service uses it to exclude password
        exec: jest.fn().mockResolvedValue(usersFromDb)
      });
      // If service does not use .select('-password'), then mockUserFind directly:
      // mockUserFind.mockResolvedValue(usersFromDb);


      const result = await userService.getUsers(tenantDbName, {});

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('User', UserModelSchema.schema);
      // expect(mockUserFind().select).toHaveBeenCalledWith('-password'); // If select is used
      expect(mockUserFind().exec).toHaveBeenCalled();
      // expect(result.every(user => user.password === undefined)).toBe(true);
      // More accurately check what toJSON provides
      expect(result).toEqual([{username: 'user1'}, {username: 'user2'}]);
    });
  });

  describe('getUserById', () => {
    it('should return a user if found (password excluded or handled by toJSON)', async () => {
      const userId = userObjectId.toString();
      const userFromDb = { _id: userId, username: 'testuser', password: hashedPassword, toJSON: () => ({_id: userId, username: 'testuser'}) };

      mockUserFindById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(userFromDb)
      });
      // If service does not use .select('-password'):
      // mockUserFindById.mockResolvedValue(userFromDb);


      const result = await userService.getUserById(tenantDbName, userId);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('User', UserModelSchema.schema);
      expect(mockUserFindById).toHaveBeenCalledWith(userId);
      // expect(mockUserFindById().select).toHaveBeenCalledWith('-password'); // If select is used
      expect(mockUserFindById().exec).toHaveBeenCalled();
      // expect(result.password).toBeUndefined();
      expect(result).toEqual({_id: userId, username: 'testuser'});
    });

    it('should throw an error if user not found by ID', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      mockUserFindById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      });
      // mockUserFindById.mockResolvedValue(null);


      await expect(userService.getUserById(tenantDbName, userId))
          .rejects.toThrow(`User with id ${userId} not found in ${tenantDbName}`);
    });
  });

  describe('updateUser', () => {
    const userId = userObjectId.toString();
    const updateData: Partial<IUser> = { username: 'updatedUser' };
    const updateDataWithPassword: Partial<IUser> = { username: 'updatedUserWithPass', password: 'new_plain_password' };

    it('should update user details successfully without password change', async () => {
      const updatedUser = { _id: userId, username: 'updatedUser', toJSON: () => ({_id: userId, username: 'updatedUser'}) };
      mockUserFindOneAndUpdate.mockResolvedValue(updatedUser);

      const result = await userService.updateUser(tenantDbName, userId, updateData);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('User', UserModelSchema.schema);
      expect(mockHashPassword).not.toHaveBeenCalled();
      expect(mockUserFindOneAndUpdate).toHaveBeenCalledWith({ _id: userId }, { $set: updateData }, { new: true, runValidators: true });
      expect(result).toEqual({_id: userId, username: 'updatedUser'});
    });

    it('should hash new password and update user if password is provided and not empty', async () => {
      const updatedUserWithHashedPass = { _id: userId, username: 'updatedUserWithPass', password: hashedPassword, toJSON: () => ({_id: userId, username: 'updatedUserWithPass'}) };
      mockUserFindOneAndUpdate.mockResolvedValue(updatedUserWithHashedPass);

      const result = await userService.updateUser(tenantDbName, userId, updateDataWithPassword);

      expect(mockHashPassword).toHaveBeenCalledWith(updateDataWithPassword.password);
      const expectedUpdatePayload = { ...updateDataWithPassword, password: hashedPassword };
      expect(mockUserFindOneAndUpdate).toHaveBeenCalledWith({ _id: userId }, { $set: expectedUpdatePayload }, { new: true, runValidators: true });
      // expect(result.password).toBeUndefined(); // Assuming toJSON removes it
      expect(result).toEqual({_id: userId, username: 'updatedUserWithPass'});
    });

    it('should not update password if password field is empty string in updateData', async () => {
      const updateWithEmptyPass: Partial<IUser> = { username: 'anotherUpdate', password: '' };
      const updatedUser = { _id: userId, username: 'anotherUpdate', toJSON: () => ({_id: userId, username: 'anotherUpdate'}) };
      mockUserFindOneAndUpdate.mockResolvedValue(updatedUser);

      await userService.updateUser(tenantDbName, userId, updateWithEmptyPass);

      expect(mockHashPassword).not.toHaveBeenCalled();
      // Ensure the password field is not included in $set if it was empty
      const expectedPayload = { username: 'anotherUpdate' }; // password field should be stripped by service logic
      expect(mockUserFindOneAndUpdate).toHaveBeenCalledWith({ _id: userId }, { $set: expectedPayload }, { new: true, runValidators: true });
    });


    it('should throw an error if user to update is not found', async () => {
      mockUserFindOneAndUpdate.mockResolvedValue(null);

      await expect(userService.updateUser(tenantDbName, userId, updateData))
          .rejects.toThrow(`User with ID '${userId}' not found for update in ${tenantDbName}`);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      const userId = userObjectId.toString();
      const deletedUser = { _id: userId, username: 'deletedUser', toJSON: () => ({_id: userId, username: 'deletedUser'}) }; // toJSON to simulate password exclusion
      mockUserFindByIdAndDelete.mockResolvedValue(deletedUser);

      const result = await userService.deleteUser(tenantDbName, userId);

      expect(mockGetTenantDb).toHaveBeenCalledWith(tenantDbName);
      expect(mockTenantDbInstance.model).toHaveBeenCalledWith('User', UserModelSchema.schema);
      expect(mockUserFindByIdAndDelete).toHaveBeenCalledWith(userId);
      expect(result).toEqual({_id: userId, username: 'deletedUser'});
    });

    it('should throw an error if user to delete is not found', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      mockUserFindByIdAndDelete.mockResolvedValue(null);

      await expect(userService.deleteUser(tenantDbName, userId))
        .rejects.toThrow(`User with ID '${userId}' not found for deletion in ${tenantDbName}`);
    });
  });
});
