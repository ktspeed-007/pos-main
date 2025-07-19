const API_BASE_URL = 'http://localhost:3001/api';

export interface Sale {
  id: string;
  items: any[];
  total: number;
  paymentMethod: string;
  timestamp: string;
  receivedAmount: number;
  changeAmount: number;
  canceled: boolean;
}

export const salesAPI = {
  async getAll(): Promise<{ success: boolean; data: Sale[]; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/sales`);
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async create(sale: Omit<Sale, 'timestamp'>): Promise<{ success: boolean; data?: Sale; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sale),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async update(id: string, sale: Partial<Sale>): Promise<{ success: boolean; data?: Sale; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/sales/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sale),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
}; 