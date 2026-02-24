import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, ApiError } from '@/types';

class ApiClient {
  private instance: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    
    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request timestamp
        (config as any).metadata = { startTime: new Date() };
        
        return config;
      },
      (error) => {
        return Promise.reject(this.handleError(error));
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response time if in development
        if (import.meta.env.DEV) {
          const { config } = response;
          const endTime = new Date();
          const duration = endTime.getTime() - (config as any).metadata.startTime.getTime();
          console.log(`API call to ${config.url} took ${duration}ms`);
        }

        return response;
      },
      (error) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: any): ApiError {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      if (status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }

      return {
        code: status.toString(),
        message: data?.message || data?.detail || 'An error occurred',
        details: data,
        timestamp: new Date().toISOString(),
      };
    } else if (error.request) {
      // Network error
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error - please check your connection',
        timestamp: new Date().toISOString(),
      };
    } else {
      // Something else happened
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.get<T>(url, config);
      return {
        data: response.data,
        status: 'success',
      };
    } catch (error) {
      return {
        error: (error as ApiError).message,
        status: 'error',
      };
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.post<T>(url, data, config);
      return {
        data: response.data,
        status: 'success',
      };
    } catch (error) {
      return {
        error: (error as ApiError).message,
        status: 'error',
      };
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.put<T>(url, data, config);
      return {
        data: response.data,
        status: 'success',
      };
    } catch (error) {
      return {
        error: (error as ApiError).message,
        status: 'error',
      };
    }
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.patch<T>(url, data, config);
      return {
        data: response.data,
        status: 'success',
      };
    } catch (error) {
      return {
        error: (error as ApiError).message,
        status: 'error',
      };
    }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.delete<T>(url, config);
      return {
        data: response.data,
        status: 'success',
      };
    } catch (error) {
      return {
        error: (error as ApiError).message,
        status: 'error',
      };
    }
  }

  // File upload
  async uploadFile<T = any>(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.instance.post<T>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });

      return {
        data: response.data,
        status: 'success',
      };
    } catch (error) {
      return {
        error: (error as ApiError).message,
        status: 'error',
      };
    }
  }

  // Set auth token
  setAuthToken(token: string) {
    localStorage.setItem('auth_token', token);
    this.instance.defaults.headers.Authorization = `Bearer ${token}`;
  }

  // Clear auth token
  clearAuthToken() {
    localStorage.removeItem('auth_token');
    delete this.instance.defaults.headers.Authorization;
  }

  // Get base URL
  getBaseUrl() {
    return this.baseURL;
  }
}

export const apiClient = new ApiClient();
export default apiClient;