import React from 'react';
import { UserIcon } from '@heroicons/react/24/outline';
import PagePlaceholder from '@/components/PagePlaceholder';

const PersonDetailPage: React.FC = () => {
  return (
    <PagePlaceholder
      title="Person Details"
      description="View detailed person information, meeting history, and analytics."
      icon={UserIcon}
    />
  );
};

export default PersonDetailPage;