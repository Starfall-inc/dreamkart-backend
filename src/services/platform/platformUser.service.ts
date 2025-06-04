// src/services/platform/platformUser.service.ts

// Import both interfaces now!
import { PlatformUser, IPlatformUser, IPlatformUserResponse } from '../../model/platform/user.model';
import bcrypt from 'bcryptjs'; // Import bcrypt for password hashing
// We don't need to import bcrypt here anymore since the model handles hashing!

class PlatformUserService {
    /**
     * Registers a new platform user (e.g., a new tenant owner).
     * @param userData The data for the new platform user (email, password, firstName, lastName, role, etc.).
     * @returns The newly created platform user document (without the passwordHash) as IPlatformUserResponse.
     */
    // ✨ Changed the return type of the Promise! ✨
    public async registerUser(userData: Partial<IPlatformUser>): Promise<IPlatformUserResponse> {
        console.log(`{PlatformUserService -> registerUser} Registering new platform user: ${userData.email}`);
        if (!userData.passwordHash) {
            throw new Error("Password is required for registration.");
        }

        const newUser = new PlatformUser(userData);
        await newUser.save(); // Password hashing happens automatically thanks to the model's pre-save hook!

        console.log(`{PlatformUserService -> registerUser} Platform user '${newUser.email}' registered successfully!`);

        // Destructure to remove passwordHash and convert to plain object
        const { passwordHash, ...userWithoutHash } = newUser.toObject();

        // ✨ Now, we cast it to our new, correct response interface! ✨
        return userWithoutHash as IPlatformUserResponse;
    }

    /**
     * Finds a platform user by their email. (Returns the full Mongoose document)
     * This is for internal service logic where you might need the password hash.
     * @param email The email of the platform user to find.
     * @returns The platform user document if found, otherwise null.
     */
    public async findByEmail(email: string): Promise<IPlatformUser | null> {
        console.log(`{PlatformUserService -> findByEmail} Searching for platform user by email: ${email}`);
        const user = await PlatformUser.findOne({ email }).exec();
        if (user) {
            console.log(`{PlatformUserService -> findByEmail} Platform user '${email}' found.`);
        } else {
            console.log(`{PlatformUserService -> findByEmail} Platform user '${email}' not found.`);
        }
        return user;
    }

    /**
     * Finds a platform user by their ID. (Returns the full Mongoose document)
     * This is for internal service logic.
     * @param userId The ID of the platform user to find.
     * @returns The platform user document if found, otherwise null.
     */
    public async findById(userId: string): Promise<IPlatformUser | null> {
        console.log(`{PlatformUserService -> findById} Searching for platform user by ID: ${userId}`);
        const user = await PlatformUser.findById(userId).exec();
        if (user) {
            console.log(`{PlatformUserService -> findById} Platform user ID '${userId}' found.`);
        } else {
            console.log(`{PlatformUserService -> findById} Platform user ID '${userId}' not found.`);
        }
        return user;
    }

    // The comparePassword method can now be used directly from the model instance
    // You don't necessarily need it in the service if you call `user.comparePassword()` directly.
    // However, keeping it here as a utility is also fine if you prefer.
    public async comparePassword(candidatePassword: string, storedHash: string): Promise<boolean> {
        return await bcrypt.compare(candidatePassword, storedHash);
    }
}

export default new PlatformUserService();