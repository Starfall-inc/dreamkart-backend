# Customer Model

This model defines the structure for customer accounts within a tenant's application. It includes personal details, shipping addresses, order history, wishlist, and an embedded shopping cart.

## Interface: `ICartItem`

```typescript
export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
}
```

## Interface: `ICustomer`

```typescript
export interface ICustomer extends Document {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  shippingAddresses: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
  }[];
  orderHistory: mongoose.Types.ObjectId[];
  wishlist: Schema.Types.ObjectId[];
  cart: ICartItem[];
  lastLoginAt?: Date;
  isActive: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}
```

## Schema Fields

*   **`email`**: (String, Required, Unique) The customer's email address, used for login and communication.
*   **`password`**: (String, Required) The hashed password for the customer's account.
*   **`firstName`**: (String, Optional) The customer's first name.
*   **`lastName`**: (String, Optional) The customer's last name.
*   **`phoneNumber`**: (String, Optional) The customer's phone number.
*   **`shippingAddresses`**: (Array of Objects) A list of shipping addresses for the customer. Each address includes:
    *   `address1`: (String, Required) Primary address line.
    *   `address2`: (String, Optional) Secondary address line.
    *   `city`: (String, Required) City.
    *   `state`: (String, Required) State/Province.
    *   `zipCode`: (String, Required) Postal code.
    *   `country`: (String, Required) Country.
    *   `isDefault`: (Boolean, Default: `false`) Indicates if this is the default shipping address.
*   **`orderHistory`**: (Array of `ObjectId`s) References to the customer's past orders.
*   **`wishlist`**: (Array of `ObjectId`s) References to products the customer has wishlisted.
*   **`cart`**: (Array of `ICartItem`s) An embedded array representing the customer's current shopping cart.
*   **`lastLoginAt`**: (Date, Optional) Timestamp of the customer's last login.
*   **`isActive`**: (Boolean, Default: `true`) Indicates if the customer account is active.

## Methods

*   **`comparePassword(candidatePassword: string): Promise<boolean>`**: Compares a given password with the stored hashed password.

## Hooks

*   **`pre('save')`**: Hashes the `password` field using `bcryptjs` before saving the document if the password has been modified.

## Usage

The `Customer` model is central to managing user accounts within each tenant's database. It provides functionalities for authentication, managing addresses, and tracking shopping activities.
