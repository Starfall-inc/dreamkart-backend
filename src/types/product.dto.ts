// types/product.dto.ts
export interface ProductDTO {
  sku: string;
  name: string;
  price: number;
  image?: string[];
  category: string; // The ID (_id) as string
  description: string;
  attributes?: Record<string, any>;
}

export interface ProductCreateDTO {
  sku: string;
  name: string;
  price: number;
  image?: string[];
  category: string; // The ID (_id) as string
  description: string;
  attributes?: Record<string, any>;
}

export interface ProductUpdateDTO {
  sku?: string;
  name?: string;
  price?: number;
  image?: string[];
  category?: string; // The ID (_id) as string
  description?: string;
  attributes?: Record<string, any>;
}

export interface ProductSearchDTO {
  query: string;
}

export interface ProductByCategoryDTO {
  category: string; // The ID (_id) as string
}
export interface ProductBySkuDTO {
  sku: string;
}
export interface ProductByIdDTO {
  id: string; // The ID (_id) as string
}

