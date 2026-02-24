import React from 'react';
import { VideoCameraIcon } from '@heroicons/react/24/outline';
import PagePlaceholder from '@/components/PagePlaceholder';

const MeetingDetailPage: React.FC = () => {
  return (
    <PagePlaceholder
      title="Meeting Details"
      description="View detailed meeting information, transcripts, and analysis."
      icon={VideoCameraIcon}
    />
  );
};

export default MeetingDetailPage;