const API_BASE_URL = 'http://localhost:3001/api';

export interface ShopInfo {
  id: string;
  name: string;
  logo?: string;
  address?: string;
  phone?: string;
  taxId?: string;
  created_at?: string;
  updated_at?: string;
}

export const shopInfoAPI = {
  async get(): Promise<{ success: boolean; data?: ShopInfo; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/shop-info`);
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async save(shopInfo: Omit<ShopInfo, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: ShopInfo; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/shop-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shopInfo),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
}; 