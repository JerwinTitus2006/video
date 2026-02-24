import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon, 
  ClockIcon,
  EnvelopeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui';

interface EmailVerificationPageProps {}

type VerificationStatus = 'pending' | 'loading' | 'success' | 'error' | 'expired';

const EmailVerificationPage: React.FC<EmailVerificationPageProps> = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('pending');
  const [countdown, setCountdown] = useState(5);
  const [email, setEmail] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  // Mock verification process
  const verifyEmail = useCallback(async (token: string) => {
    setVerificationStatus('loading');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock different scenarios based on token
      if (token === 'valid-token') {
        setVerificationStatus('success');
        setEmail('user@example.com');
        
        // Auto redirect after 5 seconds
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              navigate('/dashboard');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(timer);
      } else if (token === 'expired-token') {
        setVerificationStatus('expired');
        setEmail('user@example.com');
      } else {
        setVerificationStatus('error');
      }
    } catch (error) {
      setVerificationStatus('error');
    }
  }, [navigate]);

  // Effect for token verification
  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setVerificationStatus('error');
    }
  }, [token, verifyEmail]);

  // Retry verification
  const handleRetry = () => {
    if (token && retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setCountdown(5);
      verifyEmail(token);
    }
  };

  // Resend verification email
  const handleResendEmail = () => {
    // Mock resend functionality
    console.log('Resending verification email...');
    setVerificationStatus('pending');
    setTimeout(() => {
      setVerificationStatus('success');
    }, 2000);
  };

  // Manual continue to dashboard
  const handleContinue = () => {
    navigate('/dashboard');
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'success':
        return <CheckCircleIcon className="w-16 h-16 text-green-400" />;
      case 'error':
        return <XCircleIcon className="w-16 h-16 text-red-400" />;
      case 'expired':
        return <ExclamationTriangleIcon className="w-16 h-16 text-yellow-400" />;
      case 'pending':
      default:
        return <ClockIcon className="w-16 h-16 text-blue-400 animate-pulse" />;
    }
  };

  const getStatusMessage = () => {
    switch (verificationStatus) {
      case 'success':
        return {
          title: 'Email Verified Successfully!',
          description: `Your email has been verified. You'll be redirected to your dashboard in ${countdown} seconds.`,
          action: 'Continue to Dashboard'
        };
      case 'error':
        return {
          title: 'Verification Failed',
          description: 'The verification link is invalid or has been corrupted. Please try again or request a new verification email.',
          action: retryCount < 3 ? 'Try Again' : 'Resend Email'
        };
      case 'expired':
        return {
          title: 'Link Expired',
          description: 'This verification link has expired. Please request a new verification email to complete the process.',
          action: 'Resend Verification Email'
        };
      case 'loading':
        return {
          title: 'Verifying Your Email...',
          description: 'Please wait while we verify your email address. This may take a few moments.',
          action: null
        };
      case 'pending':
      default:
        return {
          title: 'Email Verification Required',
          description: 'Please check your email and click the verification link to activate your account.',
          action: 'Resend Email'
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-black to-accent flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md mx-auto"
      >
        {/* Glassmorphism Card */}
        <motion.div
          className="glass-card p-8 text-center relative overflow-hidden"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          {/* Background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0" />
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            {/* Status Icon */}
            <AnimatePresence mode="wait">
              <motion.div
                key={verificationStatus}
                className="flex justify-center mb-6"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {getStatusIcon()}
              </motion.div>
            </AnimatePresence>

            {/* Status Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={verificationStatus}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-2xl font-bold text-white mb-4">
                  {statusInfo.title}
                </h1>
                <p className="text-neutral-200 mb-8 leading-relaxed">
                  {statusInfo.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Email Display */}
            {email && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/10 border border-white/20 rounded-xl p-4 mb-6 flex items-center space-x-3"
              >
                <EnvelopeIcon className="w-5 h-5 text-blue-400" />
                <span className="text-white font-medium">{email}</span>
              </motion.div>
            )}

            {/* Loading indicator */}
            {verificationStatus === 'loading' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center space-x-2 mb-6"
              >
                <div className="flex space-x-1">
                  {[0, 1, 2].map((index) => (
                    <motion.div
                      key={index}
                      className="w-2 h-2 bg-blue-400 rounded-full"
                      animate={{
                        y: [-4, 4, -4],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: index * 0.2,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
                <span className="text-neutral-300 text-sm">Verifying...</span>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {statusInfo.action && verificationStatus !== 'loading' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => {
                      if (verificationStatus === 'success') {
                        handleContinue();
                      } else if (verificationStatus === 'error' && retryCount < 3) {
                        handleRetry();
                      } else {
                        handleResendEmail();
                      }
                    }}
                    className="bg-accent hover:bg-accent-700 text-white font-medium"
                  >
                    {statusInfo.action}
                    {verificationStatus === 'success' && (
                      <ArrowRightIcon className="w-4 h-4 ml-2" />
                    )}
                  </Button>
                </motion.div>
              )}

              {/* Secondary actions */}
              {verificationStatus === 'success' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-neutral-300 text-sm"
                >
                  Redirecting automatically in {countdown} second{countdown !== 1 ? 's' : ''}...
                </motion.p>
              )}

              {(verificationStatus === 'error' || verificationStatus === 'expired') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => navigate('/auth/login')}
                    className="text-neutral-300 hover:text-white border-neutral-600 hover:border-neutral-500"
                  >
                    Back to Login
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Retry count indicator */}
            {verificationStatus === 'error' && retryCount > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-neutral-400 text-xs mt-4"
              >
                Attempts: {retryCount}/3
              </motion.p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default EmailVerificationPage;