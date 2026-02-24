import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UserGroupIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ChartPieIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui';

const AnalyticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('7d');

  const metricCards = [
    {
      title: 'Total Meetings',
      value: '147',
      change: '+12.5%',
      positive: true,
      icon: UserGroupIcon,
      description: 'Meetings this period'
    },
    {
      title: 'Avg Meeting Duration',
      value: '42m',
      change: '-3.2%',
      positive: false,
      icon: ClockIcon,
      description: 'Average time per meeting'
    },
    {
      title: 'Participants',
      value: '324',
      change: '+8.7%',
      positive: true,
      icon: UserGroupIcon,
      description: 'Unique participants'
    },
    {
      title: 'Pain Points',
      value: '23',
      change: '+15.3%',
      positive: false,
      icon: ExclamationTriangleIcon,
      description: 'Issues identified'
    },
    {
      title: 'Action Items',
      value: '89',
      change: '+22.1%',
      positive: true,
      icon: DocumentTextIcon,
      description: 'Tasks generated'
    },
    {
      title: 'Completion Rate',
      value: '78%',
      change: '+5.2%',
      positive: true,
      icon: ArrowUpIcon,
      description: 'Action items completed'
    }
  ];

  const sentimentData = [
    { label: 'Positive', value: 156, percentage: 67, color: 'text-green-600' },
    { label: 'Neutral', value: 52, percentage: 22, color: 'text-gray-600' },
    { label: 'Negative', value: 25, percentage: 11, color: 'text-red-600' }
  ];

  const topParticipants = [
    { name: 'Sarah Johnson', meetings: 24, avgSentiment: 'positive', engagement: 92 },
    { name: 'Alex Rodriguez', meetings: 31, avgSentiment: 'neutral', engagement: 85 },
    { name: 'Mike Chen', meetings: 18, avgSentiment: 'positive', engagement: 88 },
    { name: 'Emma Davis', meetings: 12, avgSentiment: 'negative', engagement: 72 }
  ];

  const meetingTypes = [
    { type: 'Internal', count: 89, percentage: 61 },
    { type: 'Customer', count: 42, percentage: 29 },
    { type: 'Vendor', count: 16, percentage: 11 }
  ];

  const weeklyTrend = [
    { week: 'Week 1', meetings: 32, duration: 38 },
    { week: 'Week 2', meetings: 28, duration: 45 },
    { week: 'Week 3', meetings: 35, duration: 41 },
    { week: 'Week 4', meetings: 42, duration: 39 }
  ];

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Positive</span>;
      case 'neutral':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Neutral</span>;
      case 'negative':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Negative</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive insights and metrics from your meeting intelligence data.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  metric.positive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  <metric.icon className={`w-6 h-6 ${
                    metric.positive ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
                  }`} />
                </div>
                <div className={`flex items-center space-x-1 ${
                  metric.change.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {metric.change.startsWith('+') ? (
                    <ArrowUpIcon className="w-4 h-4" />
                  ) : (
                    <ArrowDownIcon className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">{metric.change}</span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{metric.title}</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{metric.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{metric.description}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Analysis */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sentiment Analysis</h3>
              <ChartPieIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {sentimentData.map((item, index) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      item.label === 'Positive' ? 'bg-green-500' :
                      item.label === 'Neutral' ? 'bg-gray-500' :
                      'bg-red-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <motion.div
                        className={`h-2 rounded-full ${
                          item.label === 'Positive' ? 'bg-green-500' :
                          item.label === 'Neutral' ? 'bg-gray-500' :
                          'bg-red-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                      {item.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Meeting Types Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meeting Types</h3>
              <ChartBarIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {meetingTypes.map((type, index) => (
                <div key={type.type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      type.type === 'Internal' ? 'bg-blue-500' :
                      type.type === 'Customer' ? 'bg-green-500' :
                      'bg-orange-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{type.type}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <motion.div
                        className={`h-2 rounded-full ${
                          type.type === 'Internal' ? 'bg-blue-500' :
                          type.type === 'Customer' ? 'bg-green-500' :
                          'bg-orange-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${type.percentage}%` }}
                        transition={{ delay: 0.6 + index * 0.1, duration: 0.8 }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                      {type.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Participants */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Participants</h3>
              <UserGroupIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {topParticipants.map((participant, index) => (
                <motion.div
                  key={participant.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                      <span className="text-accent text-sm font-medium">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{participant.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{participant.meetings} meetings</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getSentimentBadge(participant.avgSentiment)}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {participant.engagement}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Weekly Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Trends</h3>
              <ArrowUpIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-6">
              {/* Simple bar chart representation */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Meeting Count</h4>
                <div className="flex items-end space-x-2 h-20">
                  {weeklyTrend.map((week, index) => (
                    <div key={week.week} className="flex-1 flex flex-col items-center">
                      <motion.div
                        className="bg-blue-500 rounded-t w-full"
                        initial={{ height: 0 }}
                        animate={{ height: `${(week.meetings / 50) * 100}%` }}
                        transition={{ delay: 0.7 + index * 0.1, duration: 0.6 }}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">{week.week}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Avg Duration (minutes)</h4>
                <div className="flex items-end space-x-2 h-16">
                  {weeklyTrend.map((week, index) => (
                    <div key={week.week} className="flex-1 flex flex-col items-center">
                      <motion.div
                        className="bg-green-500 rounded-t w-full"
                        initial={{ height: 0 }}
                        animate={{ height: `${(week.duration / 60) * 100}%` }}
                        transition={{ delay: 0.9 + index * 0.1, duration: 0.6 }}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">{week.duration}m</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Additional Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Peak Meeting Hours</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Most meetings occur between 10 AM - 2 PM, with Tuesday being the busiest day.
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Action Item Trends</h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Customer meetings generate 2.3x more action items than internal meetings.
              </p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">Pain Point Patterns</h4>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Technical pain points are resolved 40% faster than business-related issues.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default AnalyticsPage;