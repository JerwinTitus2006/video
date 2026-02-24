import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Meeting, MeetingFilters, PaginationParams } from '@/types';

interface MeetingState {
  // Data
  meetings: Meeting[];
  selectedMeeting: Meeting | null;
  currentMeeting: Meeting | null; // For live meetings
  
  // UI State
  isLoading: boolean;
  error: string | null;
  filters: MeetingFilters;
  pagination: PaginationParams & { total: number };
  
  // WebSocket connection for live meeting
  isLiveConnected: boolean;
  liveUpdates: any[];
}

interface MeetingActions {
  // Data actions
  setMeetings: (meetings: Meeting[]) => void;
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (id: string, meeting: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
  setSelectedMeeting: (meeting: Meeting | null) => void;
  setCurrentMeeting: (meeting: Meeting | null) => void;
  
  // UI actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<MeetingFilters>) => void;
  setPagination: (pagination: Partial<PaginationParams & { total: number }>) => void;
  resetFilters: () => void;
  
  // Live meeting actions
  setLiveConnected: (connected: boolean) => void;
  addLiveUpdate: (update: any) => void;
  clearLiveUpdates: () => void;
}

type MeetingStore = MeetingState & MeetingActions;

const initialState: MeetingState = {
  // Data
  meetings: [],
  selectedMeeting: null,
  currentMeeting: null,
  
  // UI State
  isLoading: false,
  error: null,
  filters: {},
  pagination: { page: 1, size: 20, total: 0 },
  
  // Live meeting
  isLiveConnected: false,
  liveUpdates: [],
};

export const useMeetingStore = create<MeetingStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Data actions
      setMeetings: (meetings: Meeting[]) => {
        set({ meetings, error: null }, false, 'meeting/setMeetings');
      },

      addMeeting: (meeting: Meeting) => {
        const { meetings } = get();
        set(
          { meetings: [meeting, ...meetings] },
          false,
          'meeting/addMeeting'
        );
      },

      updateMeeting: (id: string, meetingUpdate: Partial<Meeting>) => {
        const { meetings } = get();
        const updatedMeetings = meetings.map((meeting) =>
          meeting.id === id ? { ...meeting, ...meetingUpdate } : meeting
        );
        set(
          { meetings: updatedMeetings },
          false,
          'meeting/updateMeeting'
        );
      },

      deleteMeeting: (id: string) => {
        const { meetings } = get();
        const filteredMeetings = meetings.filter((meeting) => meeting.id !== id);
        set(
          { meetings: filteredMeetings },
          false,
          'meeting/deleteMeeting'
        );
      },

      setSelectedMeeting: (meeting: Meeting | null) => {
        set({ selectedMeeting: meeting }, false, 'meeting/setSelectedMeeting');
      },

      setCurrentMeeting: (meeting: Meeting | null) => {
        set({ currentMeeting: meeting }, false, 'meeting/setCurrentMeeting');
      },

      // UI actions
      setLoading: (isLoading: boolean) => {
        set({ isLoading }, false, 'meeting/setLoading');
      },

      setError: (error: string | null) => {
        set({ error }, false, 'meeting/setError');
      },

      setFilters: (newFilters: Partial<MeetingFilters>) => {
        const { filters } = get();
        set(
          { 
            filters: { ...filters, ...newFilters },
            pagination: { ...get().pagination, page: 1 } // Reset to page 1 when filtering
          },
          false,
          'meeting/setFilters'
        );
      },

      setPagination: (newPagination: Partial<PaginationParams & { total: number }>) => {
        const { pagination } = get();
        set(
          { pagination: { ...pagination, ...newPagination } },
          false,
          'meeting/setPagination'
        );
      },

      resetFilters: () => {
        set(
          { 
            filters: {},
            pagination: { ...get().pagination, page: 1 }
          },
          false,
          'meeting/resetFilters'
        );
      },

      // Live meeting actions
      setLiveConnected: (isLiveConnected: boolean) => {
        set({ isLiveConnected }, false, 'meeting/setLiveConnected');
      },

      addLiveUpdate: (update: any) => {
        const { liveUpdates } = get();
        set(
          { liveUpdates: [...liveUpdates, update] },
          false,
          'meeting/addLiveUpdate'
        );
      },

      clearLiveUpdates: () => {
        set({ liveUpdates: [] }, false, 'meeting/clearLiveUpdates');
      },
    }),
    {
      name: 'meeting-store',
    }
  )
);