import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import JitsiMeeting from '@/components/JitsiMeeting';
import { Button, Card } from '@/components/ui';
import { MeetingService } from '@/services/meetingService';

interface LiveAnalysis {
  sentiment: {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
    speaker: string;
    text: string;
  }[];
  painPoints: {
    label: string;
    text: string;
    speaker: string;
    timestamp: string;
  }[];
  actionSuggestions: {
    text: string;
    priority: 'low' | 'medium' | 'high';
  }[];
}

const LiveMeetingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [liveAnalysis, setLiveAnalysis] = useState<LiveAnalysis>({
    sentiment: [],
    painPoints: [],
    actionSuggestions: [],
  });
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Load meeting and Jitsi room info
  useEffect(() => {
    if (!id) return;

    const loadMeeting = async () => {
      try {
        const response = await MeetingService.getJitsiInfo(id);
        setRoomInfo(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load meeting:', error);
        // Try to start the meeting if it doesn't have a room yet
        try {
          const startResponse = await MeetingService.startJitsiMeeting(id);
          setRoomInfo(startResponse.data);
          setLoading(false);
        } catch (startError) {
          console.error('Failed to start meeting:', startError);
          setLoading(false);
        }
      }
    };

    loadMeeting();
  }, [id]);

  // WebSocket connection for live AI analysis
  useEffect(() => {
    if (!id) return;

    const wsUrl = `ws://localhost:8000/live/${id}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected for live analysis');
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'sentiment_update':
          setLiveAnalysis(prev => ({
            ...prev,
            sentiment: [...prev.sentiment.slice(-9), {
              score: data.score,
              label: data.score > 0.3 ? 'positive' : data.score < -0.3 ? 'negative' : 'neutral',
              speaker: data.speaker,
              text: data.text,
            }],
          }));
          break;
        
        case 'pain_point_detected':
          setLiveAnalysis(prev => ({
            ...prev,
            painPoints: [...prev.painPoints, {
              label: data.label,
              text: data.text,
              speaker: data.speaker,
              timestamp: new Date().toISOString(),
            }],
          }));
          break;
        
        case 'action_suggestion':
          setLiveAnalysis(prev => ({
            ...prev,
            actionSuggestions: [...prev.actionSuggestions, {
              text: data.text,
              priority: data.priority || 'medium',
            }],
          }));
          break;
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [id]);

  const handleMeetingEnd = () => {
    // Navigate back to meeting detail page
    navigate(`/meetings/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <div className="text-neutral-600 dark:text-neutral-400">
            Preparing your meeting...
          </div>
        </div>
      </div>
    );
  }

  if (!roomInfo) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-xl mb-4">
            Failed to load meeting
          </div>
          <Button onClick={() => navigate('/meetings')}>
            Back to Meetings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Live Meeting
          </h1>
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            Live
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalysis(!showAnalysis)}
          >
            <ChartBarIcon className="w-4 h-4 mr-2" />
            {showAnalysis ? 'Hide' : 'Show'} Analysis
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMeetingEnd}
          >
            <XMarkIcon className="w-5 h-5 mr-2" />
            Leave Meeting
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Jitsi Video */}
        <div className={`flex-1 p-4 ${showAnalysis ? 'mr-0' : ''}`}>
          <JitsiMeeting
            roomName={roomInfo.jitsi_room_id}
            domain={import.meta.env.VITE_JITSI_DOMAIN || 'localhost:8000'}
            displayName="User"
            onMeetingEnd={handleMeetingEnd}
            className="h-full"
          />
        </div>

        {/* Live AI Analysis Panel */}
        {showAnalysis && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-96 bg-white dark:bg-neutral-800 border-l border-neutral-200 dark:border-neutral-700 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              {/* Real-time Sentiment */}
              <Card>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-blue-500" />
                    Live Sentiment
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {liveAnalysis.sentiment.length === 0 ? (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Waiting for conversation...
                      </p>
                    ) : (
                      liveAnalysis.sentiment.map((item, idx) => (
                        <div key={idx} className="text-sm border-l-4 pl-3 py-1" style={{
                          borderColor: item.label === 'positive' ? '#10b981' : item.label === 'negative' ? '#ef4444' : '#6b7280'
                        }}>
                          <div className="font-medium text-neutral-700 dark:text-neutral-300">
                            {item.speaker}
                          </div>
                          <div className="text-neutral-600 dark:text-neutral-400 truncate">
                            {item.text}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>

              {/* Pain Points */}
              <Card>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-orange-500" />
                    Pain Points Detected
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {liveAnalysis.painPoints.length === 0 ? (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        No pain points detected yet
                      </p>
                    ) : (
                      liveAnalysis.painPoints.map((item, idx) => (
                        <div key={idx} className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                          <div className="flex items-start justify-between mb-1">
                            <span className="text-xs font-medium text-orange-700 dark:text-orange-400 uppercase">
                              {item.label}
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-1">
                            {item.text}
                          </p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            — {item.speaker}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>

              {/* Action Suggestions */}
              <Card>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center">
                    <ChartBarIcon className="w-5 h-5 mr-2 text-green-500" />
                    AI Suggestions
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {liveAnalysis.actionSuggestions.length === 0 ? (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        No suggestions yet
                      </p>
                    ) : (
                      liveAnalysis.actionSuggestions.map((item, idx) => (
                        <div key={idx} className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <div className="flex items-start">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                              item.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {item.priority}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1">
                            {item.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LiveMeetingPage;
