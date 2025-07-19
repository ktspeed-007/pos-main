const API_BASE_URL = 'http://localhost:3001/api';

export interface Warehouse {
  id: string;
  warehouseCode: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export const warehouseAPI = {
  async getAll(): Promise<{ success: boolean; data: Warehouse[]; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/warehouses`);
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async create(warehouse: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: Warehouse; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/warehouses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(warehouse),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async update(id: string, warehouse: Partial<Warehouse>): Promise<{ success: boolean; data?: Warehouse; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/warehouses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(warehouse),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async delete(id: string): Promise<{ success: boolean; data?: Warehouse; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/warehouses/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
}; 