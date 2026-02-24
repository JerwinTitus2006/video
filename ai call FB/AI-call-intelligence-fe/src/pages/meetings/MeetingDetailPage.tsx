import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  VideoCameraIcon, 
  ArrowLeftIcon, 
  PlayIcon,
  DocumentTextIcon,
  ClockIcon,
  UsersIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { Button, Card } from '@/components/ui';
import { MeetingService } from '@/services/meetingService';

const MeetingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadMeeting();
    }
  }, [id]);

  const loadMeeting = async () => {
    try {
      setLoading(true);
      const response = await MeetingService.getMeeting(id!);
      setMeeting(response.data);
    } catch (error) {
      console.error('Failed to load meeting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = async () => {
    try {
      const response = await MeetingService.joinJitsiMeeting(id!);
      if (response.data) {
        navigate(`/meetings/${id}/live`);
      }
    } catch (error) {
      console.error('Failed to join meeting:', error);
      alert('Failed to join meeting');
    }
  };

  const handleStartMeeting = async () => {
    try {
      const response = await MeetingService.startJitsiMeeting(id!);
      if (response.data) {
        navigate(`/meetings/${id}/live`);
      }
    } catch (error) {
      console.error('Failed to start meeting:', error);
      alert('Failed to start meeting');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-6">
        <div className="text-center text-neutral-600 dark:text-neutral-400">
          Meeting not found
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/meetings')}>
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              {meeting.title}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Meeting Details
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          {meeting.status === 'in_progress' && (
            <Button onClick={handleJoinMeeting} className="bg-green-600 hover:bg-green-700">
              <PlayIcon className="w-4 h-4 mr-2" />
              Join Live Meeting
            </Button>
          )}
          {meeting.status === 'pending' && (
            <Button onClick={handleStartMeeting} className="bg-blue-600 hover:bg-blue-700">
              <VideoCameraIcon className="w-4 h-4 mr-2" />
              Start Meeting
            </Button>
          )}
        </div>
      </div>

      {/* Meeting Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Started At</div>
                <div className="font-semibold text-neutral-900 dark:text-white">
                  {meeting.started_at ? new Date(meeting.started_at).toLocaleString() : 'Not started'}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center space-x-3">
              <ClockIcon className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Status</div>
                <div className="font-semibold text-neutral-900 dark:text-white capitalize">
                  {meeting.status.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Transcript</div>
                <div className="font-semibold text-neutral-900 dark:text-white">
                  {meeting.transcript ? 'Available' : 'Not Available'}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Transcript */}
      {meeting.transcript && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
              Transcript
            </h2>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 max-h-96 overflow-y-auto">
              <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {meeting.transcript}
              </p>
            </div>
          </div>
        </Card>
      )}

      {!meeting.transcript && meeting.status !== 'in_progress' && (
        <Card>
          <div className="p-12 text-center">
            <DocumentTextIcon className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              No Transcript Available
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              The transcript will be available after the meeting ends and processing completes.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MeetingDetailPage;
