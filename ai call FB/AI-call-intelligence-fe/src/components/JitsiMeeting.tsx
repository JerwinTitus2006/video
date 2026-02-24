import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface JitsiMeetingProps {
  roomName: string;
  domain?: string;
  displayName?: string;
  email?: string;
  onMeetingEnd?: () => void;
  onParticipantJoined?: (participant: any) => void;
  onParticipantLeft?: (participant: any) => void;
  className?: string;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

const JitsiMeeting: React.FC<JitsiMeetingProps> = ({
  roomName,
  domain = 'localhost:8000',
  displayName = 'Guest',
  email = '',
  onMeetingEnd,
  onParticipantJoined,
  onParticipantLeft,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const jitsiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load Jitsi External API script
    const loadJitsiScript = () => {
      if (window.JitsiMeetExternalAPI) {
        initializeJitsi();
        return;
      }

      // Determine protocol based on domain - use http for localhost
      const protocol = domain.includes('localhost') ? 'http' : 'https';
      const script = document.createElement('script');
      script.src = `${protocol}://${domain}/external_api.js`;
      script.async = true;
      script.onload = () => initializeJitsi();
      script.onerror = () => {
        setError('Failed to load Jitsi Meet API. Please check the domain configuration.');
        setLoading(false);
      };
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    };

    const initializeJitsi = () => {
      if (!containerRef.current || jitsiRef.current) return;

      try {
        const options = {
          roomName,
          width: '100%',
          height: '100%',
          parentNode: containerRef.current,
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            enableWelcomePage: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'closedcaptions',
              'desktop',
              'fullscreen',
              'fodeviceselection',
              'hangup',
              'chat',
              'recording',
              'livestreaming',
              'etherpad',
              'sharedvideo',
              'settings',
              'raisehand',
              'videoquality',
              'filmstrip',
              'stats',
              'shortcuts',
              'tileview',
              'download',
              'help',
              'mute-everyone',
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_REMOTE_DISPLAY_NAME: 'Guest',
          },
          userInfo: {
            displayName,
            email,
          },
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);
        jitsiRef.current = api;

        // Event listeners
        api.addEventListener('videoConferenceJoined', () => {
          setLoading(false);
          console.log('Joined conference');
        });

        api.addEventListener('readyToClose', () => {
          console.log('Meeting ended');
          onMeetingEnd?.();
        });

        api.addEventListener('participantJoined', (participant: any) => {
          console.log('Participant joined:', participant);
          onParticipantJoined?.(participant);
        });

        api.addEventListener('participantLeft', (participant: any) => {
          console.log('Participant left:', participant);
          onParticipantLeft?.(participant);
        });

        api.addEventListener('errorOccurred', (error: any) => {
          console.error('Jitsi error:', error);
          setError(error.message || 'An error occurred during the meeting');
        });

      } catch (err: any) {
        console.error('Failed to initialize Jitsi:', err);
        setError(err.message || 'Failed to initialize video conference');
        setLoading(false);
      }
    };

    loadJitsiScript();

    // Cleanup
    return () => {
      if (jitsiRef.current) {
        jitsiRef.current.dispose();
        jitsiRef.current = null;
      }
    };
  }, [roomName, domain, displayName, email, onMeetingEnd, onParticipantJoined, onParticipantLeft]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="text-center p-6">
          <div className="text-red-600 dark:text-red-400 text-lg font-semibold mb-2">
            Meeting Error
          </div>
          <div className="text-neutral-600 dark:text-neutral-400 text-sm">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-lg z-10"
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
            <div className="text-neutral-600 dark:text-neutral-400">
              Connecting to meeting...
            </div>
          </div>
        </motion.div>
      )}
      <div
        ref={containerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '500px' }}
      />
    </div>
  );
};

export default JitsiMeeting;
