// src/services/application/customer.service.ts
import mongoose from "mongoose";
import Customer, { ICustomer } from "../../model/application/customer.model";
import { getTenantDb } from "../../connection/tenantDb";

class CustomerService {
  private getTenantCustomerModel(tenantDbName: string) {
    const tenantDb: mongoose.Connection = getTenantDb(tenantDbName);
    // Ensure the model is compiled for this specific connection
    if (tenantDb.models.Customer) {
      return tenantDb.models.Customer as mongoose.Model<ICustomer>;
    }
    return tenantDb.model<ICustomer>('Customer', Customer.schema);
  }

  /**
   * Creates a new customer for a specific tenant.
   * @param tenantDbName The name of the tenant's database.
   * @param customerData The customer data, including password.
   */
  async createCustomer(tenantDbName: string, customerData: Partial<ICustomer>): Promise<ICustomer> {
    try {
      const TenantCustomer = this.getTenantCustomerModel(tenantDbName);
      // Ensure email uniqueness within the tenant's database
      const existingCustomer = await TenantCustomer.findOne({ email: customerData.email });
      if (existingCustomer) {
        throw new Error('Customer with this email already exists!');
      }

      const newCustomer = new TenantCustomer(customerData);
      await newCustomer.save();
      console.log(`{CustomerService -> createCustomer} Successfully created customer '${newCustomer.email}' for tenant DB '${tenantDbName}'`);
      return newCustomer;
    } catch (error: any) {
      console.error(`{CustomerService -> createCustomer} Failed to create customer for tenant DB '${tenantDbName}':`, error);
      // Propagate specific errors like validation or duplicate key (11000)
      if (error.code === 11000) {
        throw new Error('A customer with this email already exists.');
      }
      if (error.name === 'ValidationError') {
        throw new Error(`Validation Error: ${error.message}`);
      }
      throw new Error(`Failed to create customer: ${error.message || error}`);
    }
  }

  /**
   * Authenticates a customer for a specific tenant.
   * @param tenantDbName The name of the tenant's database.
   * @param email The customer's email.
   * @param password The customer's plain text password.
   */
  async loginCustomer(tenantDbName: string, email: string, password: string): Promise<ICustomer | null> {
    try {
      const TenantCustomer = this.getTenantCustomerModel(tenantDbName);
      const customer: any  = await TenantCustomer.findOne({ email });

      if (!customer || !customer.isActive) {
        return null; // Customer not found or not active
      }

      const isMatch = await customer.comparePassword(password);
      if (!isMatch) {
        return null; // Password does not match
      }

      // Update last login time
      customer.lastLoginAt = new Date();
      await customer.save();

      return customer;
    } catch (error) {
      console.error(`{CustomerService -> loginCustomer} Failed to log in customer for tenant DB '${tenantDbName}':`, error);
      throw error;
    }
  }

  /**
   * Get customer by ID for a specific tenant.
   */
  async getCustomerById(tenantDbName: string, customerId: string): Promise<ICustomer | null> {
    try {
      const TenantCustomer = this.getTenantCustomerModel(tenantDbName);
      const customer = await TenantCustomer.findById(customerId);
      return customer;
    } catch (error) {
      console.error(`{CustomerService -> getCustomerById} Failed to get customer by ID '${customerId}' for tenant DB '${tenantDbName}':`, error);
      throw error;
    }
  }

  /**
   * Update customer data for a specific tenant.
   */
  async updateCustomer(tenantDbName: string, customerId: string, updateData: Partial<ICustomer>): Promise<ICustomer | null> {
    try {
      const TenantCustomer = this.getTenantCustomerModel(tenantDbName);
      const updatedCustomer = await TenantCustomer.findByIdAndUpdate(
        customerId,
        { $set: updateData }, // Only set fields provided in updateData
        { new: true, runValidators: true } // Return the updated document, run schema validators
      );
      if (updatedCustomer) {
        console.log(`{CustomerService -> updateCustomer} Successfully updated customer '${customerId}' for tenant DB '${tenantDbName}'`);
      } else {
        console.warn(`{CustomerService -> updateCustomer} Customer with ID '${customerId}' not found for update in tenant DB '${tenantDbName}'`);
      }
      return updatedCustomer;
    } catch (error: any) {
      console.error(`{CustomerService -> updateCustomer} Failed to update customer '${customerId}' for tenant DB '${tenantDbName}':`, error);
      if (error.name === 'ValidationError') {
        throw new Error(`Validation Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete a customer for a specific tenant.
   */
  async deleteCustomer(tenantDbName: string, customerId: string): Promise<ICustomer | null> {
    try {
      const TenantCustomer = this.getTenantCustomerModel(tenantDbName);
      const deletedCustomer = await TenantCustomer.findByIdAndDelete(customerId);
      if (deletedCustomer) {
        console.log(`{CustomerService -> deleteCustomer} Successfully deleted customer '${customerId}' from tenant DB '${tenantDbName}'`);
      } else {
        console.warn(`{CustomerService -> deleteCustomer} Customer with ID '${customerId}' not found for deletion in tenant DB '${tenantDbName}'`);
      }
      return deletedCustomer;
    } catch (error) {
      console.error(`{CustomerService -> deleteCustomer} Failed to delete customer '${customerId}' for tenant DB '${tenantDbName}':`, error);
      throw error;
    }
  }

}

export default new CustomerService();