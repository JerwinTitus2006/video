import React, { useState } from 'react';
import { VideoCameraIcon, CalendarIcon, ClockIcon, UsersIcon } from '@heroicons/react/24/outline';
import { Modal, Button, Input } from '@/components/ui';

interface NewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (meetingData: any) => void;
}

const NewMeetingModal: React.FC<NewMeetingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: '',
    type: 'internal',
    participants: '',
    tags: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Meeting title is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.time) newErrors.time = 'Time is required';
    if (!formData.duration) newErrors.duration = 'Duration is required';

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      // Combine date and time
      const meetingDateTime = new Date(`${formData.date}T${formData.time}`).toISOString();
      
      const meetingData = {
        title: formData.title,
        description: formData.description,
        date: meetingDateTime,
        duration: parseInt(formData.duration),
        type: formData.type,
        participants: formData.participants ? parseInt(formData.participants) : 1,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        status: 'scheduled' as const,
        transcript: false,
        sentiment: 'neutral' as const,
        host: 'Current User', // This should come from auth store
      };

      await onSubmit(meetingData);
      handleClose();
    } catch (error) {
      console.error('Error creating meeting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      duration: '',
      type: 'internal',
      participants: '',
      tags: '',
    });
    setErrors({});
    onClose();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Schedule New Meeting"
      description="Create a new meeting entry to track and analyze later"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Meeting Title */}
        <Input
          label="Meeting Title"
          placeholder="Enter meeting title"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          error={errors.title}
          leftIcon={<VideoCameraIcon className="w-5 h-5" />}
          fullWidth
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Description (Optional)
          </label>
          <textarea
            placeholder="Brief description of the meeting..."
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-neutral-300 rounded-xl transition-all duration-200 
                     placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                     dark:bg-neutral-800 dark:border-neutral-600 dark:text-white dark:placeholder-neutral-500"
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            error={errors.date}
            leftIcon={<CalendarIcon className="w-5 h-5" />}
            fullWidth
          />
          <Input
            label="Time"
            type="time"
            value={formData.time}
            onChange={(e) => handleChange('time', e.target.value)}
            error={errors.time}
            leftIcon={<ClockIcon className="w-5 h-5" />}
            fullWidth
          />
        </div>

        {/* Duration and Participants */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Duration (minutes)
            </label>
            <select
              value={formData.duration}
              onChange={(e) => handleChange('duration', e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 rounded-xl transition-all duration-200 
                       focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                       dark:bg-neutral-800 dark:border-neutral-600 dark:text-white"
            >
              <option value="">Select duration</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
            </select>
            {errors.duration && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.duration}</p>}
          </div>

          <Input
            label="Expected Participants"
            type="number"
            placeholder="Number of participants"
            value={formData.participants}
            onChange={(e) => handleChange('participants', e.target.value)}
            leftIcon={<UsersIcon className="w-5 h-5" />}
            min="1"
            max="100"
            fullWidth
          />
        </div>

        {/* Meeting Type */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Meeting Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full px-4 py-3 border border-neutral-300 rounded-xl transition-all duration-200 
                     focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                     dark:bg-neutral-800 dark:border-neutral-600 dark:text-white"
          >
            <option value="internal">Internal</option>
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
          </select>
        </div>

        {/* Tags */}
        <Input
          label="Tags (Optional)"
          placeholder="Enter tags separated by commas"
          value={formData.tags}
          onChange={(e) => handleChange('tags', e.target.value)}
          helpText="e.g. sales, review, planning"
          fullWidth
        />

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Meeting'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default NewMeetingModal;