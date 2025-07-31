const API_BASE_URL = 'http://localhost:3001/api';

export interface PurchaseOrder {
  id: string;
  items: any[];
  total: number;
  status: string;
  sellerId?: string;
  sellerName?: string;
  createdBy?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  paymentMethod?: string;
  creditDays?: number;
  dueDate?: string;
  created_at?: string;
  updated_at?: string;
}

export const purchaseOrderAPI = {
  async getAll(): Promise<{ success: boolean; data: PurchaseOrder[]; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders`);
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async create(purchaseOrder: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: PurchaseOrder; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseOrder),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async update(id: string, purchaseOrder: Partial<PurchaseOrder>): Promise<{ success: boolean; data?: PurchaseOrder; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseOrder),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async delete(id: string): Promise<{ success: boolean; data?: PurchaseOrder; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getById(id: string): Promise<{ success: boolean; data?: PurchaseOrder; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${id}`);
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
}; 