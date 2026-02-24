import { apiClient } from './api';
import type { 
  Person, 
  PersonCreateData, 
  PersonAnalytics,
  ListResponse, 
  PaginationParams 
} from '@/types';

export class PersonService {
  // Get all persons with pagination
  static async getPersons(
    pagination: PaginationParams = { page: 1, size: 20 },
    filters: { role?: string; company?: string; search?: string } = {}
  ) {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      size: pagination.size.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      ),
    });

    return apiClient.get<ListResponse<Person>>(`/persons?${params}`);
  }

  // Get single person by ID
  static async getPerson(id: string) {
    return apiClient.get<Person>(`/persons/${id}`);
  }

  // Create new person
  static async createPerson(data: PersonCreateData) {
    return apiClient.post<Person>('/persons', data);
  }

  // Update person
  static async updatePerson(id: string, data: Partial<PersonCreateData>) {
    return apiClient.patch<Person>(`/persons/${id}`, data);
  }

  // Delete person
  static async deletePerson(id: string) {
    return apiClient.delete(`/persons/${id}`);
  }

  // Get person analytics
  static async getPersonAnalytics(
    id: string, 
    dateFrom?: string, 
    dateTo?: string
  ) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    return apiClient.get<PersonAnalytics>(
      `/analytics/persons/${id}?${params}`
    );
  }

  // Upload voice sample for person
  static async uploadVoiceSample(
    id: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ) {
    return apiClient.uploadFile(`/persons/${id}/voice-sample`, file, onProgress);
  }

  // Train voice biometric for person
  static async trainVoiceBiometric(id: string) {
    return apiClient.post(`/persons/${id}/train-voice`);
  }

  // Search persons by name or email
  static async searchPersons(query: string) {
    return apiClient.get<Person[]>(`/persons/search?q=${encodeURIComponent(query)}`);
  }

  // Get person's meeting history
  static async getPersonMeetings(
    id: string, 
    pagination: PaginationParams = { page: 1, size: 20 }
  ) {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      size: pagination.size.toString(),
    });

    return apiClient.get(`/persons/${id}/meetings?${params}`);
  }

  // Get person's pain points
  static async getPersonPainPoints(
    id: string, 
    pagination: PaginationParams = { page: 1, size: 20 }
  ) {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      size: pagination.size.toString(),
    });

    return apiClient.get(`/persons/${id}/pain-points?${params}`);
  }

  // Get person's action items
  static async getPersonActionItems(
    id: string, 
    pagination: PaginationParams = { page: 1, size: 20 }
  ) {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      size: pagination.size.toString(),
    });

    return apiClient.get(`/persons/${id}/action-items?${params}`);
  }

  // Bulk import persons
  static async bulkImport(file: File, onProgress?: (progress: number) => void) {
    return apiClient.uploadFile('/persons/bulk-import', file, onProgress);
  }

  // Export persons data
  static async exportPersons(format: 'csv' | 'xlsx' = 'csv', filters?: any) {
    const params = new URLSearchParams({ format });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value as string);
      });
    }

    return apiClient.get(`/persons/export?${params}`, {
      responseType: 'blob',
    });
  }
}

export default PersonService;