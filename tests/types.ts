export interface ProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
}

export interface Product extends ProductInput {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface ProductList {
  data: Product[];
  pagination: { total: number; limit: number; offset: number };
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
