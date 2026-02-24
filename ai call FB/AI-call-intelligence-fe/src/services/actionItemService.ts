import { apiClient } from './api';
import type { 
  ActionItem, 
  ActionItemCreateData, 
  ActionItemFilters,
  ListResponse, 
  PaginationParams 
} from '@/types';

export class ActionItemService {
  // Get all action items with filtering and pagination
  static async getActionItems(
    pagination: PaginationParams = { page: 1, size: 20 },
    filters: ActionItemFilters = {}
  ) {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      size: pagination.size.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      ),
    });

    return apiClient.get<ListResponse<ActionItem>>(`/action_items?${params}`);
  }

  // Get single action item by ID
  static async getActionItem(id: string) {
    return apiClient.get<ActionItem>(`/action_items/${id}`);
  }

  // Create new action item
  static async createActionItem(data: ActionItemCreateData) {
    return apiClient.post<ActionItem>('/action_items', data);
  }

  // Update action item
  static async updateActionItem(id: string, data: Partial<ActionItemCreateData>) {
    return apiClient.patch<ActionItem>(`/action_items/${id}`, data);
  }

  // Delete action item
  static async deleteActionItem(id: string) {
    return apiClient.delete(`/action_items/${id}`);
  }

  // Mark action item as completed
  static async completeActionItem(id: string) {
    return apiClient.post(`/action_items/${id}/complete`);
  }

  // Start progress on action item
  static async startActionItem(id: string) {
    return apiClient.post(`/action_items/${id}/start`);
  }

  // Cancel action item
  static async cancelActionItem(id: string, reason?: string) {
    return apiClient.post(`/action_items/${id}/cancel`, { reason });
  }

  // Get action items by meeting
  static async getActionItemsByMeeting(
    meetingId: string, 
    pagination: PaginationParams = { page: 1, size: 20 }
  ) {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      size: pagination.size.toString(),
    });

    return apiClient.get(`/meetings/${meetingId}/action-items?${params}`);
  }

  // Get action items by person
  static async getActionItemsByPerson(
    owner: string, 
    pagination: PaginationParams = { page: 1, size: 20 }
  ) {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      size: pagination.size.toString(),
      owner,
    });

    return apiClient.get(`/action_items?${params}`);
  }

  // Get overdue action items
  static async getOverdueActionItems(
    pagination: PaginationParams = { page: 1, size: 20 }
  ) {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      size: pagination.size.toString(),
      overdue: 'true',
    });

    return apiClient.get(`/action_items?${params}`);
  }

  // Get action items due in next X days
  static async getActionItemsDueSoon(
    days: number = 7,
    pagination: PaginationParams = { page: 1, size: 20 }
  ) {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      size: pagination.size.toString(),
      due_in_days: days.toString(),
    });

    return apiClient.get(`/action_items?${params}`);
  }

  // Bulk update action items
  static async bulkUpdate(ids: string[], data: {
    status?: string;
    owner?: string;
    due_date?: string;
  }) {
    return apiClient.patch('/action_items/bulk', { ids, ...data });
  }

  // Search action items
  static async searchActionItems(query: string, filters?: ActionItemFilters) {
    const params = new URLSearchParams({ q: query });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value as string);
      });
    }

    return apiClient.get<ActionItem[]>(`/action_items/search?${params}`);
  }

  // Get action item analytics
  static async getActionItemAnalytics(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    return apiClient.get(`/analytics/action-items?${params}`);
  }

  // Export action items
  static async exportActionItems(
    format: 'csv' | 'xlsx' = 'csv',
    filters?: ActionItemFilters
  ) {
    const params = new URLSearchParams({ format });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value as string);
      });
    }

    return apiClient.get(`/action_items/export?${params}`, {
      responseType: 'blob',
    });
  }

  // Generate action items from meeting
  static async generateFromMeeting(meetingId: string) {
    return apiClient.post(`/ai/generate-action-items`, { meeting_id: meetingId });
  }

  // Send reminder for action item
  static async sendReminder(id: string) {
    return apiClient.post(`/action_items/${id}/remind`);
  }
}

export default ActionItemService;