import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { 
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { Button, Input } from '@/components/ui';
import { useUIStore } from '@/store';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const email = watch('email');
  const isEmailValid = !errors.email && email && email.includes('@');

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock success - in real app, this would call the API
      setSentEmail(data.email);
      setEmailSent(true);
      
      addToast({
        type: 'success',
        title: 'Reset Email Sent!',
        message: 'Check your inbox for password reset instructions.',
      });
      
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Failed to Send Email',
        message: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAnotherEmail = () => {
    setEmailSent(false);
    setSentEmail('');
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-black to-accent flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md mx-auto"
        >
          {/* Success Card */}
          <motion.div
            className="glass-card p-8 text-center relative overflow-hidden"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0" />
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex justify-center mb-6"
              >
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="w-8 h-8 text-green-400" />
                </div>
              </motion.div>

              {/* Success Message */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h1 className="text-2xl font-bold text-white mb-4">
                  Check Your Email
                </h1>
                <p className="text-neutral-200 mb-6 leading-relaxed">
                  We've sent password reset instructions to:
                </p>
              </motion.div>

              {/* Email Display */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/10 border border-white/20 rounded-xl p-4 mb-8 flex items-center justify-center space-x-3"
              >
                <EnvelopeIcon className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium">{sentEmail}</span>
              </motion.div>

              {/* Instructions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-neutral-300 text-sm mb-8 space-y-2"
              >
                <p>• Click the link in the email to reset your password</p>
                <p>• The link will expire in 1 hour for security</p>
                <p>• Check your spam folder if you don't see the email</p>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-4"
              >
                <Button
                  onClick={handleTryAnotherEmail}
                  className="w-full bg-gradient-to-r from-accent to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300"
                >
                  Try Another Email
                </Button>
                
                <Link
                  to="/login"
                  className="block w-full text-center text-neutral-300 hover:text-white transition-colors py-2"
                >
                  Back to Login
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-black to-accent flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md mx-auto"
      >
        {/* Reset Password Card */}
        <motion.div
          className="glass-card p-8 relative overflow-hidden"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                className="w-16 h-16 bg-gradient-to-br from-blue-500 to-accent rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
                initial={{ rotate: -10 }}
                animate={{ rotate: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <EnvelopeIcon className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Reset Password
              </h1>
              <p className="text-neutral-200">
                Enter your email address and we'll send you instructions to reset your password.
              </p>
            </div>

            {/* Reset Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              {/* Email Field */}
              <div>
                <Input
                  {...register('email')}
                  type="email"
                  label="Email Address"
                  placeholder="Enter your email address"
                  error={errors.email?.message}
                  className="bg-white/10 border-white/20 text-white placeholder:text-neutral-300 focus:border-accent focus:ring-accent/50"
                  leftIcon={<EnvelopeIcon className="w-5 h-5 text-neutral-400" />}
                  rightIcon={isEmailValid ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  ) : undefined}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || isLoading || !isEmailValid}
                className="w-full bg-gradient-to-r from-blue-500 to-accent hover:from-blue-600 hover:to-accent-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:transform-none disabled:opacity-50"
              >
                {isSubmitting || isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <EnvelopeIcon className="w-5 h-5" />
                    <span>Send Reset Instructions</span>
                  </div>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gradient-to-r from-transparent via-neutral-900/50 to-transparent text-neutral-300">
                    or
                  </span>
                </div>
              </div>
            </div>

            {/* Back to Login */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 text-center"
            >
              <Link
                to="/login"
                className="inline-flex items-center space-x-2 text-neutral-300 hover:text-white transition-colors group"
              >
                <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Login</span>
              </Link>
            </motion.div>

            {/* Help Text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 text-center"
            >
              <p className="text-xs text-neutral-400">
                Remember your password?{' '}
                <Link 
                  to="/login" 
                  className="text-accent hover:text-accent-400 underline"
                >
                  Sign in instead
                </Link>
              </p>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center"
        >
          <div className="flex items-center justify-center space-x-2 text-xs text-neutral-400">
            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400" />
            <span>Reset links expire after 1 hour for your security</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;