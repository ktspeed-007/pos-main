const API_BASE_URL = 'http://localhost:3001/api';

export interface Log {
  id: string;
  action: string;
  username: string;
  details?: string;
  timestamp: string;
}

export const logAPI = {
  async getAll(): Promise<{ success: boolean; data: Log[]; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/logs`);
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async create(log: Omit<Log, 'id' | 'timestamp'>): Promise<{ success: boolean; data?: Log; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(log),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
}; 