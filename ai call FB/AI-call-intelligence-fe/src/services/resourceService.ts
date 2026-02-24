import { apiClient } from './api';
import type { 
  Resource, 
  ResourceCreateData,
  ListResponse, 
  PaginationParams 
} from '@/types';

export class ResourceService {
  // Get all resources with filtering and pagination
  static async getResources(
    pagination: PaginationParams = { page: 1, size: 20 },
    filters: { 
      type?: string; 
      category?: string; 
      tags?: string[];
      search?: string; 
    } = {}
  ) {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      size: pagination.size.toString(),
    });

    // Add simple filters
    if (filters.type) params.append('type', filters.type);
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    
    // Add tags as multiple parameters
    if (filters.tags?.length) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }

    return apiClient.get<ListResponse<Resource>>(`/resources?${params}`);
  }

  // Get single resource by ID
  static async getResource(id: string) {
    return apiClient.get<Resource>(`/resources/${id}`);
  }

  // Create new resource
  static async createResource(data: ResourceCreateData) {
    return apiClient.post<Resource>('/resources', data);
  }

  // Update resource
  static async updateResource(id: string, data: Partial<ResourceCreateData>) {
    return apiClient.patch<Resource>(`/resources/${id}`, data);
  }

  // Delete resource
  static async deleteResource(id: string) {
    return apiClient.delete(`/resources/${id}`);
  }

  // Upload resource file
  static async uploadResourceFile(
    id: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ) {
    return apiClient.uploadFile(`/resources/${id}/upload`, file, onProgress);
  }

  // Search resources
  static async searchResources(
    query: string, 
    filters?: { type?: string; category?: string; tags?: string[] }
  ) {
    const params = new URLSearchParams({ q: query });
    if (filters?.type) params.append('type', filters.type);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.tags?.length) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }

    return apiClient.get<Resource[]>(`/resources/search?${params}`);
  }

  // Get resource recommendations for pain point
  static async getResourceRecommendations(painPointId: string, limit: number = 5) {
    return apiClient.get<Resource[]>(
      `/pain_points/${painPointId}/resource-recommendations?limit=${limit}`
    );
  }

  // Match resources to meeting
  static async matchResourcesToMeeting(meetingId: string) {
    return apiClient.post(`/ai/match-resources`, { meeting_id: meetingId });
  }

  // Get resource categories
  static async getCategories() {
    return apiClient.get<string[]>('/resources/categories');
  }

  // Get resource types
  static async getTypes() {
    return apiClient.get<string[]>('/resources/types');
  }

  // Get all tags
  static async getTags() {
    return apiClient.get<string[]>('/resources/tags');
  }

  // Get popular resources
  static async getPopularResources(limit: number = 10) {
    return apiClient.get<Resource[]>(`/resources/popular?limit=${limit}`);
  }

  // Get recently added resources
  static async getRecentResources(limit: number = 10) {
    return apiClient.get<Resource[]>(`/resources/recent?limit=${limit}`);
  }

  // Bulk import resources
  static async bulkImport(file: File, onProgress?: (progress: number) => void) {
    return apiClient.uploadFile('/resources/bulk-import', file, onProgress);
  }

  // Export resources
  static async exportResources(
    format: 'csv' | 'xlsx' = 'csv',
    filters?: { type?: string; category?: string; tags?: string[] }
  ) {
    const params = new URLSearchParams({ format });
    if (filters?.type) params.append('type', filters.type);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.tags?.length) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }

    return apiClient.get(`/resources/export?${params}`, {
      responseType: 'blob',
    });
  }

  // Download resource file
  static async downloadResource(id: string) {
    return apiClient.get(`/resources/${id}/download`, {
      responseType: 'blob',
    });
  }

  // Get resource usage analytics
  static async getResourceAnalytics(id: string, dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    return apiClient.get(`/analytics/resources/${id}?${params}`);
  }

  // Process resource content (extract text, generate embeddings)
  static async processResource(id: string) {
    return apiClient.post(`/ai/process-resource`, { resource_id: id });
  }
}

export default ResourceService;