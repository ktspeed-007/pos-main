
import { useState, useCallback } from 'react';
import { ApiResponse } from '../services/api';
import { toast } from 'sonner';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async <R = T>(
    apiCall: () => Promise<ApiResponse<R>>,
    options: UseApiOptions = {}
  ): Promise<R | null> => {
    const {
      showSuccessToast = false,
      showErrorToast = true,
      successMessage = 'ดำเนินการสำเร็จ'
    } = options;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiCall();

      if (response.success && response.data) {
        setState({
          data: response.data as unknown as T,
          loading: false,
          error: null,
        });

        if (showSuccessToast) {
          toast.success(successMessage);
        }

        return response.data;
      } else {
        const errorMessage = response.error || 'เกิดข้อผิดพลาด';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));

        if (showErrorToast) {
          toast.error(errorMessage);
        }

        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      if (showErrorToast) {
        toast.error(errorMessage);
      }

      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Specialized hooks for common operations
export function useProducts() {
  return useApi<import('../services/api').Product[]>();
}

export function useSales() {
  return useApi<import('../services/api').Sale[]>();
}

export function useUsers() {
  return useApi<import('../services/api').User[]>();
}
