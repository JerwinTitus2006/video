import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  VideoCameraIcon,
  CalendarIcon,
  ClockIcon,
  PlayIcon,
  DocumentTextIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Button, Card } from '@/components/ui';
import { NewMeetingModal } from '@/components/forms';
import AdvancedTable from '@/components/AdvancedTable';
import type { TableColumn } from '@/components/AdvancedTable';

interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  participants: number;
  status: 'completed' | 'processing' | 'failed';
  transcript: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  tags: string[];
  host: string;
  type: 'internal' | 'customer' | 'vendor';
}

const mockMeetings: Meeting[] = [
  {
    id: '1',
    title: 'Q4 Sales Review',
    date: '2024-02-23T14:00:00Z',
    duration: 45,
    participants: 8,
    status: 'completed',
    transcript: true,
    sentiment: 'positive',
    tags: ['sales', 'review', 'quarterly'],
    host: 'Sarah Johnson',
    type: 'internal'
  },
  {
    id: '2',
    title: 'Client Discovery Call - TechCorp',
    date: '2024-02-23T10:30:00Z',
    duration: 30,
    participants: 4,
    status: 'completed',
    transcript: true,
    sentiment: 'positive',
    tags: ['discovery', 'client', 'techcorp'],
    host: 'Mike Chen',
    type: 'customer'
  },
  {
    id: '3',
    title: 'Product Roadmap Discussion',
    date: '2024-02-22T16:00:00Z',
    duration: 60,
    participants: 12,
    status: 'processing',
    transcript: false,
    sentiment: 'neutral',
    tags: ['product', 'roadmap', 'planning'],
    host: 'Alex Rodriguez',
    type: 'internal'
  },
  {
    id: '4',
    title: 'Vendor Negotiation - CloudServ',
    date: '2024-02-22T11:00:00Z',
    duration: 90,
    participants: 5,
    status: 'completed',
    transcript: true,
    sentiment: 'negative',
    tags: ['vendor', 'negotiation', 'cloudserv'],
    host: 'Emma Davis',
    type: 'vendor'
  },
  {
    id: '5',
    title: 'Team Standup',
    date: '2024-02-23T09:00:00Z',
    duration: 15,
    participants: 6,
    status: 'completed',
    transcript: true,
    sentiment: 'neutral',
    tags: ['standup', 'daily', 'team'],
    host: 'David Kim',
    type: 'internal'
  }
];

const MeetingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedMeetings, setSelectedMeetings] = useState<string[]>([]);
  const [meetings, setMeetings] = useState(mockMeetings);
  const [isNewMeetingModalOpen, setIsNewMeetingModalOpen] = useState(false);

  const filteredMeetings = useMemo(() => {
    return meetings.filter(meeting => {
      const matchesSearch = meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter;
      const matchesType = typeFilter === 'all' || meeting.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [meetings, searchQuery, statusFilter, typeFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completed</span>;
      case 'processing':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Processing</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Failed</span>;
      default:
        return null;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Positive</span>;
      case 'neutral':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Neutral</span>;
      case 'negative':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Negative</span>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'internal':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Internal</span>;
      case 'customer':
        return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Customer</span>;
      case 'vendor':
        return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Vendor</span>;
      default:
        return null;
    }
  };

  const columns: TableColumn<Meeting>[] = [
    {
      key: 'title',
      label: 'Meeting Title',
      sortable: true,
      searchable: true,
      render: (value, row) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
            <VideoCameraIcon className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Host: {row.host}</p>
          </div>
        </div>
      )
    },
    {
      key: 'date',
      label: 'Date & Time',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <CalendarIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm">{formatDate(value)}</span>
        </div>
      )
    },
    {
      key: 'duration',
      label: 'Duration',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm">{value}m</span>
        </div>
      )
    },
    {
      key: 'participants',
      label: 'Participants',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <UsersIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm">{value} people</span>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type',
      filterable: true,
      render: (value) => getTypeBadge(value)
    },
    {
      key: 'status',
      label: 'Status',
      filterable: true,
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'sentiment',
      label: 'Sentiment',
      render: (value) => getSentimentBadge(value)
    },
    {
      key: 'transcript',
      label: 'Transcript',
      render: (value) => (
        <div className="flex items-center space-x-2">
          <DocumentTextIcon className={`w-4 h-4 ${value ? 'text-green-500' : 'text-gray-300'}`} />
          <span className={`text-sm ${value ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
            {value ? 'Available' : 'Not Available'}
          </span>
        </div>
      )
    }
  ];

  const handleViewMeeting = (meeting: Meeting) => {
    navigate(`/meetings/${meeting.id}`);
  };

  const handlePlayRecording = (meeting: Meeting) => {
    if (meeting.status === 'completed') {
      // In a real app, this would open a media player or navigate to a playback page
      window.open(`/meetings/${meeting.id}/recording`, '_blank');
    }
  };

  const handleNewMeeting = async (meetingData: Partial<Meeting>) => {
    try {
      // Generate a new ID (in real app, this would be handled by the backend)
      const id = `${Date.now()}`;
      
      const newMeeting: Meeting = {
        id,
        title: meetingData.title!,
        date: meetingData.date!,
        duration: meetingData.duration!,
        participants: meetingData.participants || 1,
        status: 'scheduled',
        transcript: false,
        sentiment: 'neutral',
        tags: meetingData.tags || [],
        host: meetingData.host || 'Current User',
        type: meetingData.type as 'internal' | 'customer' | 'vendor',
      };

      // Add to meetings state (in real app, this would be an API call)
      setMeetings(prev => [newMeeting, ...prev]);
      
      console.log('New meeting created:', newMeeting);
    } catch (error) {
      console.error('Error creating meeting:', error);
    }
  };

  const stats = [
    {
      title: 'Total Meetings',
      value: meetings.length,
      change: '+12%',
      positive: true,
      icon: VideoCameraIcon
    },
    {
      title: 'This Week',
      value: meetings.filter(m => {
        const meetingDate = new Date(m.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return meetingDate >= weekAgo;
      }).length,
      change: '+3',
      positive: true,
      icon: CalendarIcon
    },
    {
      title: 'Avg Duration',
      value: meetings.length > 0 ? `${Math.round(meetings.reduce((acc, m) => acc + m.duration, 0) / meetings.length)}m` : '0m',
      change: '-5m',
      positive: false,
      icon: ClockIcon
    },
    {
      title: 'With Transcripts',
      value: meetings.filter(m => m.transcript).length,
      change: '100%',
      positive: true,
      icon: DocumentTextIcon
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meetings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your recorded meetings, view transcripts, and analyze conversations.
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setIsNewMeetingModalOpen(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          New Meeting
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  stat.positive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  <stat.icon className={`w-6 h-6 ${
                    stat.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  stat.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">from last period</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="internal">Internal</option>
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
          </select>
        </div>
      </Card>

      {/* Meetings Table */}
      <Card>
        <AdvancedTable
          data={filteredMeetings}
          columns={columns}
          selectable={true}
          selectedRows={selectedMeetings}
          onSelectionChange={setSelectedMeetings}
          actions={[
            {
              label: 'View Details',
              onClick: handleViewMeeting,
              variant: 'primary'
            },
            {
              label: 'Play Recording',
              onClick: handlePlayRecording,
              icon: PlayIcon,
              disabled: (meeting) => meeting.status !== 'completed'
            }
          ]}
          emptyMessage="No meetings found"
          emptyDescription="Start by uploading meeting recordings or connecting your video conferencing platform."
        />
      </Card>

      {/* New Meeting Modal */}
      <NewMeetingModal
        isOpen={isNewMeetingModalOpen}
        onClose={() => setIsNewMeetingModalOpen(false)}
        onSubmit={handleNewMeeting}
      />
    </div>
  );
};

export default MeetingsPage;