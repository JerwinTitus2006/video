import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  ListBulletIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  CalendarIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui';
import AdvancedTable from '@/components/AdvancedTable';
import type { TableColumn } from '@/components/AdvancedTable';

interface SearchResult {
  id: string;
  type: 'meeting' | 'person' | 'pain-point' | 'action-item' | 'resource' | 'transcript';
  title: string;
  description: string;
  content?: string;
  relevanceScore: number;
  date: string;
  source: string;
  metadata: Record<string, any>;
  highlights: string[];
}

const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    type: 'meeting',
    title: 'Q4 Sales Review',
    description: 'Quarterly meeting discussing sales performance and targets for next quarter',
    content: 'We discussed the API performance issues that TechCorp has been experiencing...',
    relevanceScore: 95,
    date: '2024-02-23T14:00:00Z',
    source: 'Meeting Transcript',
    metadata: {
      duration: 45,
      participants: 8,
      host: 'Sarah Johnson'
    },
    highlights: ['API performance', 'TechCorp', 'quarterly targets']
  },
  {
    id: '2',
    type: 'pain-point',
    title: 'Slow API Response Times',
    description: 'Customers reporting delays in API responses affecting their applications',
    relevanceScore: 88,
    date: '2024-02-20T10:30:00Z',
    source: 'Pain Point Analysis',
    metadata: {
      severity: 'high',
      frequency: 8,
      category: 'technical'
    },
    highlights: ['API response', 'performance delays', 'customer impact']
  },
  {
    id: '3',
    type: 'action-item',
    title: 'Follow up on API performance issues',
    description: 'Investigate and resolve the API response time problems discussed with TechCorp',
    relevanceScore: 82,
    date: '2024-02-23T14:00:00Z',
    source: 'Action Items',
    metadata: {
      assignee: 'Alex Rodriguez',
      priority: 'high',
      status: 'in-progress'
    },
    highlights: ['API performance', 'technical investigation', 'TechCorp']
  },
  {
    id: '4',
    type: 'person',
    title: 'Alex Rodriguez - Product Manager',
    description: 'Product Manager responsible for API development and technical integrations',
    relevanceScore: 75,
    date: '2024-02-22T16:00:00Z',
    source: 'Contact Directory',
    metadata: {
      department: 'Product',
      meetingsCount: 31,
      engagementScore: 78
    },
    highlights: ['Product Manager', 'API development', 'technical lead']
  },
  {
    id: '5',
    type: 'resource',
    title: 'TechCorp API Integration Guide.pdf',
    description: 'Comprehensive guide for integrating with TechCorp\'s API endpoints',
    relevanceScore: 72,
    date: '2024-02-20T10:00:00Z',
    source: 'Resources Library',
    metadata: {
      fileSize: '2.4MB',
      downloads: 24,
      owner: 'Alex Rodriguez'
    },
    highlights: ['API integration', 'TechCorp documentation', 'technical guide']
  },
  {
    id: '6',
    type: 'transcript',
    title: 'Client Discovery Call - TechCorp (Transcript)',
    description: 'Full transcript of discovery call discussing integration requirements',
    content: '...the client mentioned they are experiencing performance issues with our current API...',
    relevanceScore: 68,
    date: '2024-02-22T10:30:00Z',
    source: 'Meeting Transcript',
    metadata: {
      duration: 30,
      wordCount: 2847,
      sentiment: 'positive'
    },
    highlights: ['API performance issues', 'integration requirements', 'client feedback']
  }
];

const SearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('API performance');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const filteredResults = useMemo(() => {
    let results = mockSearchResults;

    // Filter by type
    if (typeFilter !== 'all') {
      results = results.filter(result => result.type === typeFilter);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case '7d':
          filterDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          filterDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          filterDate.setDate(now.getDate() - 90);
          break;
      }
      
      if (dateFilter !== 'all') {
        results = results.filter(result => new Date(result.date) >= filterDate);
      }
    }

    // Sort results
    results.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.relevanceScore - a.relevanceScore;
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return results;
  }, [typeFilter, dateFilter, sortBy]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return VideoCameraIcon;
      case 'person':
        return UsersIcon;
      case 'pain-point':
        return ExclamationTriangleIcon;
      case 'action-item':
        return ListBulletIcon;
      case 'resource':
        return DocumentTextIcon;
      case 'transcript':
        return DocumentTextIcon;
      default:
        return DocumentTextIcon;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeMap = {
      'meeting': { label: 'Meeting', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
      'person': { label: 'Person', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      'pain-point': { label: 'Pain Point', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
      'action-item': { label: 'Action Item', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
      'resource': { label: 'Resource', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
      'transcript': { label: 'Transcript', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' }
    };

    const typeInfo = typeMap[type as keyof typeof typeMap] || typeMap.resource;
    return <span className={`px-2 py-1 text-xs rounded-full ${typeInfo.color}`}>{typeInfo.label}</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const typeStats = mockSearchResults.reduce((acc, result) => {
    acc[result.type] = (acc[result.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Search</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Find meetings, people, documents, and insights across all your data.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Main Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search across meetings, people, documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              <span>Advanced Filters</span>
            </button>
            
            {Object.entries(typeStats).map(([type, count]) => {
              const Icon = getTypeIcon(type);
              return (
                <button
                  key={type}
                  onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                  className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                    typeFilter === type
                      ? 'bg-accent text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{type.replace('-', ' ')} ({count})</span>
                </button>
              );
            })}
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="meeting">Meetings</option>
                  <option value="person">People</option>
                  <option value="pain-point">Pain Points</option>
                  <option value="action-item">Action Items</option>
                  <option value="resource">Resources</option>
                  <option value="transcript">Transcripts</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time Period
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="relevance">Relevance</option>
                  <option value="date">Date</option>
                  <option value="type">Type</option>
                </select>
              </div>
            </motion.div>
          )}
        </div>
      </Card>

      {/* Search Results */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600 dark:text-gray-400">
          Found {filteredResults.length} results for "<span className="font-medium">{searchQuery}</span>"
        </p>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {filteredResults.map((result, index) => {
          const Icon = getTypeIcon(result.type);
          return (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {result.title}
                        </h3>
                        {getTypeBadge(result.type)}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <span className="font-medium text-accent">{result.relevanceScore}%</span>
                          <span>match</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="w-4 h-4" />
                          <span>{formatDate(result.date)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-3">{result.description}</p>
                    
                    {result.content && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                          "{result.content}..."
                        </p>
                      </div>
                    )}
                    
                    {result.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {result.highlights.map((highlight, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Source: {result.source}
                      </span>
                      
                      {/* Metadata */}
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        {result.metadata.duration && (
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="w-3 h-3" />
                            <span>{result.metadata.duration}m</span>
                          </div>
                        )}
                        {result.metadata.participants && (
                          <div className="flex items-center space-x-1">
                            <UsersIcon className="w-3 h-3" />
                            <span>{result.metadata.participants} people</span>
                          </div>
                        )}
                        {result.metadata.fileSize && (
                          <span>{result.metadata.fileSize}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filteredResults.length === 0 && (
        <Card className="p-12 text-center">
          <MagnifyingGlassIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No results found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
        </Card>
      )}
    </div>
  );
};

export default SearchPage;