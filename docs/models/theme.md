# Theme Model

This model defines the structure for available themes in the themestore.

## Interface: `ITheme`

```typescript
export interface ITheme extends Document {
  name: string;
  slug: string;
  cdnUrl: string;
  description?: string;
  tags?: string[];
  isFree?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Schema Fields

*   **`name`**: (String, Required) The display name of the theme.
*   **`slug`**: (String, Required, Unique) A unique, URL-friendly identifier for the theme.
*   **`cdnUrl`**: (String, Required) The URL where the theme's assets are hosted.
*   **`description`**: (String, Optional) A brief description of the theme.
*   **`tags`**: (Array of Strings, Optional) An array of tags to categorize the theme.
*   **`isFree`**: (Boolean, Optional, Default: `true`) Indicates whether the theme is free or paid.

## Usage

The `Theme` model is used to manage and retrieve information about the various themes available for tenants to use in their stores. It includes timestamps for `createdAt` and `updatedAt`.
