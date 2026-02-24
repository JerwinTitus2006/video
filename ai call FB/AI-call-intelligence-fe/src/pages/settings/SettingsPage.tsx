import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Cog6ToothIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  CheckIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { Button, Card } from '@/components/ui';
import { useAuthStore } from '@/store';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const settingsSections: SettingsSection[] = [
  {
    id: 'profile',
    title: 'Profile Settings',
    description: 'Manage your account information and preferences',
    icon: UserIcon,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Configure notification preferences and alerts',
    icon: BellIcon,
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    description: 'Control your privacy settings and security options',
    icon: ShieldCheckIcon,
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Manage third-party integrations and API settings',
    icon: GlobeAltIcon,
  },
];

const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState('profile');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || '',
    department: 'Product Team',
    phone: '+1 (555) 123-4567',
    timezone: 'EST (UTC-5)',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    meetingReminders: true,
    painPointAlerts: true,
    actionItemDeadlines: true,
    weeklyReports: false,
    realTimeUpdates: true,
  });

  const [privacySettings, setPrivacySettings] = useState({
    shareAnalytics: true,
    allowDataExport: true,
    twoFactorAuth: false,
    dataRetention: '12',
    meetingRecording: 'automatic',
  });

  const handleSaveProfile = () => {
    setEditingProfile(false);
    alert(`Profile updated successfully!\\n\\nName: ${profileData.name}\\nEmail: ${profileData.email}\\nTitle: ${profileData.title}`);
  };

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Profile Information</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => editingProfile ? handleSaveProfile() : setEditingProfile(true)}
        >
          {editingProfile ? (
            <><CheckIcon className="w-4 h-4 mr-2" />Save</>
          ) : (
            <><PencilIcon className="w-4 h-4 mr-2" />Edit</>
          )}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
            disabled={!editingProfile}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
            disabled={!editingProfile}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Role
          </label>
          <input
            type="text"
            value={profileData.role}
            onChange={(e) => setProfileData({ ...profileData, role: e.target.value })}
            disabled={!editingProfile}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Department
          </label>
          <input
            type="text"
            value={profileData.department}
            onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
            disabled={!editingProfile}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
            disabled={!editingProfile}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Timezone
          </label>
          <select
            value={profileData.timezone}
            onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
            disabled={!editingProfile}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800"
          >
            <option value="EST (UTC-5)">EST (UTC-5)</option>
            <option value="PST (UTC-8)">PST (UTC-8)</option>
            <option value="GMT (UTC+0)">GMT (UTC+0)</option>
            <option value="CET (UTC+1)">CET (UTC+1)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notification Preferences</h3>
      
      <div className="space-y-4">
        {[
          { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
          { key: 'pushNotifications', label: 'Push Notifications', description: 'Browser and mobile push notifications' },
          { key: 'meetingReminders', label: 'Meeting Reminders', description: 'Get reminded about upcoming meetings' },
          { key: 'painPointAlerts', label: 'Pain Point Alerts', description: 'Alerts when new pain points are identified' },
          { key: 'actionItemDeadlines', label: 'Action Item Deadlines', description: 'Reminders for action item due dates' },
          { key: 'weeklyReports', label: 'Weekly Reports', description: 'Automated weekly summary reports' },
          { key: 'realTimeUpdates', label: 'Real-time Updates', description: 'Live updates during active meetings' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">{item.label}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
            </div>
            <button
              onClick={() => setNotificationSettings({
                ...notificationSettings,
                [item.key]: !notificationSettings[item.key as keyof typeof notificationSettings]
              })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                notificationSettings[item.key as keyof typeof notificationSettings]
                  ? 'bg-accent'
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationSettings[item.key as keyof typeof notificationSettings]
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Privacy & Security</h3>
      
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">Data & Analytics</h4>
          {[
            { key: 'shareAnalytics', label: 'Share Analytics', description: 'Allow anonymous usage analytics to improve the service' },
            { key: 'allowDataExport', label: 'Data Export', description: 'Allow exporting your data for backup purposes' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white">{item.label}</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
              </div>
              <button
                onClick={() => setPrivacySettings({
                  ...privacySettings,
                  [item.key]: !privacySettings[item.key as keyof typeof privacySettings]
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                  privacySettings[item.key as keyof typeof privacySettings]
                    ? 'bg-accent'
                    : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    privacySettings[item.key as keyof typeof privacySettings]
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
        
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">Security</h4>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security to your account</p>
            </div>
            <Button variant="outline" size="sm">
              {privacySettings.twoFactorAuth ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">Data Management</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Retention Period
              </label>
              <select
                value={privacySettings.dataRetention}
                onChange={(e) => setPrivacySettings({ ...privacySettings, dataRetention: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="6">6 months</option>
                <option value="12">12 months</option>
                <option value="24">24 months</option>
                <option value="indefinite">Indefinite</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meeting Recording
              </label>
              <select
                value={privacySettings.meetingRecording}
                onChange={(e) => setPrivacySettings({ ...privacySettings, meetingRecording: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="automatic">Automatic</option>
                <option value="manual">Manual only</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderIntegrationsSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Integrations & API</h3>
      
      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Connected Applications</h4>
          <div className="space-y-3">
            {[
              { name: 'Slack', status: 'connected', description: 'Receive notifications in Slack channels' },
              { name: 'Microsoft Teams', status: 'disconnected', description: 'Send meeting summaries to Teams' },
              { name: 'Google Calendar', status: 'connected', description: 'Sync meetings with Google Calendar' },
              { name: 'Zoom', status: 'connected', description: 'Automatically record Zoom meetings' },
            ].map((app) => (
              <div key={app.name} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white">{app.name}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{app.description}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    app.status === 'connected'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {app.status}
                  </span>
                  <Button variant="outline" size="sm">
                    {app.status === 'connected' ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">API Access</h4>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white">API Key</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">Use this key to access the API</p>
              </div>
              <Button variant="outline" size="sm">
                Regenerate
              </Button>
            </div>
            <code className="block w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-3 py-2 text-sm font-mono text-gray-900 dark:text-white">
              sk_test_ABC123...XYZ789
            </code>
          </div>
        </div>
      </div>
    </div>
  );

  const renderThemeSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Appearance</h3>
      
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">Theme Preference</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { key: 'light', label: 'Light', icon: SunIcon, description: 'Light mode' },
            { key: 'dark', label: 'Dark', icon: MoonIcon, description: 'Dark mode' },
            { key: 'system', label: 'System', icon: ComputerDesktopIcon, description: 'Follow system' },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setTheme(option.key as 'light' | 'dark' | 'system')}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                theme === option.key
                  ? 'border-accent bg-accent/5'
                  : 'border-gray-200 dark:border-gray-700 hover:border-accent/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <option.icon className={`w-5 h-5 ${
                  theme === option.key ? 'text-accent' : 'text-gray-500 dark:text-gray-400'
                }`} />
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white">{option.label}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'privacy':
        return renderPrivacySettings();
      case 'integrations':
        return renderIntegrationsSettings();
      case 'appearance':
        return renderThemeSettings();
      default:
        return renderProfileSettings();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account settings and application preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {[
              ...settingsSections,
              {
                id: 'appearance',
                title: 'Appearance',
                description: 'Theme and display preferences',
                icon: ComputerDesktopIcon,
              }
            ].map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-3 text-left rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-accent text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <div>
                    <p className="font-medium">{section.title}</p>
                    <p className={`text-xs ${
                      activeSection === section.id
                        ? 'text-white/70'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {section.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6">
              {renderContent()}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;