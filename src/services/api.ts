
const API_BASE_URL = 'http://localhost:3001/api';

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  qrcode?: string;
  stock: number;
  category?: string;
  active: boolean;
  created_at: string;
  productCode?: string;
  lotCode?: string;
  sellerId?: string;
  seller?: string;
  productionDate?: string;
  expiryDate?: string;
  paymentMethod?: 'cash' | 'check' | 'credit';
  paymentMethods?: {
    cash: boolean;
    check: boolean;
    credit: boolean;
  };
  creditDays?: number;
  dueDate?: string;
  minStock?: number;
  maxStock?: number;
  warehouseId?: string;
  warehouseName?: string;
  storageLocationId?: string;
  storageLocationName?: string;
}

export interface Sale {
  id: string;
  total: number;
  payment_method: 'cash' | 'qrcode';
  received_amount?: number;
  change_amount?: number;
  canceled: boolean;
  canceled_by?: string;
  canceled_at?: string;
  created_at: string;
  items: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product: Product;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'staff';
  active: boolean;
  created_at: string;
}

// Generic API call function
async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP error! status: ${response.status}`,
      };
    }

    return {
      success: true,
      data: data.data !== undefined ? data.data : data,
    };
  } catch (error) {
    console.error('API call error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Authentication API
export const authAPI = {
  login: async (username: string, password: string): Promise<ApiResponse<{ user: User }>> => {
    return apiCall<{ user: User }>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  getAllUsers: async (): Promise<ApiResponse<User[]>> => {
    return apiCall<User[]>('/users');
  },

  createUser: async (userData: Omit<User, 'id' | 'created_at'> & { password: string }): Promise<ApiResponse<User>> => {
    return apiCall<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  updateUser: async (userId: string, userData: Partial<User>): Promise<ApiResponse<User>> => {
    return apiCall<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  toggleUserActive: async (userId: string): Promise<ApiResponse<User>> => {
    return apiCall<User>(`/users/${userId}/toggle`, {
      method: 'PATCH',
    });
  },
};

// Products API
export const productsAPI = {
  getAll: async (): Promise<ApiResponse<Product[]>> => {
    return apiCall<Product[]>('/products');
  },

  getById: async (id: string): Promise<ApiResponse<Product>> => {
    return apiCall<Product>(`/products/${id}`);
  },

  create: async (productData: Omit<Product, 'id' | 'created_at'>): Promise<ApiResponse<Product>> => {
    return apiCall<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  update: async (id: string, productData: Partial<Product>): Promise<ApiResponse<Product>> => {
    return apiCall<Product>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(productData),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiCall<void>(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  updateStock: async (id: string, stock: number): Promise<ApiResponse<Product>> => {
    return apiCall<Product>(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
    });
  },

  // อัปเดตสต็อกหลายรายการพร้อมกัน (สำหรับการรับของ)
  updateMultipleStock: async (stockUpdates: Array<{ id: string; stock: number }>): Promise<ApiResponse<Product[]>> => {
    return apiCall<Product[]>('/products/stock/bulk', {
      method: 'PATCH',
      body: JSON.stringify({ updates: stockUpdates }),
    });
  },
};

// Sales API
export const salesAPI = {
  create: async (saleData: {
    items: Array<{
      id: string;
      quantity: number;
      price: number;
    }>;
    total: number;
    paymentMethod: 'cash' | 'qrcode';
    receivedAmount?: number;
    changeAmount?: number;
  }): Promise<ApiResponse<{ saleId: string }>> => {
    return apiCall<{ saleId: string }>('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
  },

  getAll: async (limit?: number, offset?: number): Promise<ApiResponse<Sale[]>> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    return apiCall<Sale[]>(`/sales?${params.toString()}`);
  },

  getById: async (id: string): Promise<ApiResponse<Sale>> => {
    return apiCall<Sale>(`/sales/${id}`);
  },

  cancel: async (id: string, reason?: string): Promise<ApiResponse<Sale>> => {
    return apiCall<Sale>(`/sales/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

  getToday: async (): Promise<ApiResponse<Sale[]>> => {
    return apiCall<Sale[]>('/sales/today');
  },
};

// Health check
export const healthAPI = {
  check: async (): Promise<ApiResponse<{ message: string; timestamp: string }>> => {
    return apiCall<{ message: string; timestamp: string }>('/test');
  },
};
