const API_BASE_URL = 'http://localhost:3001/api';

export interface Seller {
  id: string;
  shopCode: string;
  name: string;
  address?: string;
  phone?: string;
  taxId?: string;
  bankAccount?: string;
  bankName?: string;
  created_at?: string;
  updated_at?: string;
}

export const sellerAPI = {
  async getAll(): Promise<{ success: boolean; data: Seller[]; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/sellers`);
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async create(seller: Omit<Seller, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: Seller; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/sellers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(seller),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async update(id: string, seller: Partial<Seller>): Promise<{ success: boolean; data?: Seller; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/sellers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(seller),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async delete(id: string): Promise<{ success: boolean; data?: Seller; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/sellers/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
}; 