const API_BASE_URL = 'http://localhost:3001/api';

export interface StorageLocation {
  id: string;
  storageCode: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// ฟังก์ชันแปลง field จาก backend (storagecode) เป็น frontend (storageCode)
function mapStorageLocationResponse(item: any): StorageLocation {
  return {
    id: item.id,
    storageCode: item.storagecode, // map จาก storagecode (backend) เป็น storageCode (frontend)
    name: item.name,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

export const storageLocationAPI = {
  async getAll(): Promise<{ success: boolean; data: StorageLocation[]; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/storage-locations`);
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        return { success: true, data: result.data.map(mapStorageLocationResponse) };
      }
      return result;
    } catch (error) {
      return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async create(storageLocation: Omit<StorageLocation, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: StorageLocation; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/storage-locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storageLocation),
      });
      const result = await response.json();
      if (result.success && result.data) {
        return { success: true, data: mapStorageLocationResponse(result.data) };
      }
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async update(id: string, storageLocation: Partial<StorageLocation>): Promise<{ success: boolean; data?: StorageLocation; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/storage-locations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storageLocation),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async delete(id: string): Promise<{ success: boolean; data?: StorageLocation; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/storage-locations/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
}; 