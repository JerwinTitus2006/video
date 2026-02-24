import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { Button, Input } from '@/components/ui';
import { useAuthStore, useUIStore } from '@/store';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface AuthError {
  type: 'error' | 'warning' | 'info';
  message: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { addToast } = useUIStore();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const email = watch('email');
  const password = watch('password');

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setAuthError(null);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock authentication logic with role detection
      if (data.email === 'admin@test.com' && data.password === 'admin123') {
        const adminUser = {
          id: '1',
          name: 'Admin User',
          email: data.email,
          role: 'admin' as const,
          avatar: '',
          company: 'AI Corp',
          permissions: ['read', 'write', 'admin', 'super_admin'],
          preferences: {
            theme: 'system' as const,
            language: 'en',
            timezone: 'UTC',
            notifications: {
              email_notifications: true,
              push_notifications: true,
              meeting_reminders: true,
              pain_point_alerts: true,
              action_item_due: true,
              weekly_reports: true,
            },
          },
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        
        login(adminUser, 'admin_jwt_token_' + Date.now());
        
        addToast({
          type: 'success',
          title: 'Welcome Back!',
          message: `Admin access granted. Redirecting to dashboard...`,
        });
        
        navigate('/dashboard');
        
      } else if (data.email === 'user@test.com' && data.password === 'user123') {
        const regularUser = {
          id: '2',
          name: 'Regular User',
          email: data.email,
          role: 'user' as const,
          avatar: '',
          company: 'Client Corp',
          permissions: ['read', 'write'],
          preferences: {
            theme: 'light' as const,
            language: 'en',
            timezone: 'UTC',
            notifications: {
              email_notifications: true,
              push_notifications: false,
              meeting_reminders: true,
              pain_point_alerts: true,
              action_item_due: true,
              weekly_reports: false,
            },
          },
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        
        login(regularUser, 'user_jwt_token_' + Date.now());
        
        addToast({
          type: 'success',
          title: 'Welcome Back!',
          message: `Signed in successfully. Taking you to your meetings...`,
        });
        
        navigate('/meetings');
        
      } else {
        setLoginAttempts(prev => prev + 1);
        
        if (loginAttempts >= 2) {
          setAuthError({
            type: 'error',
            message: 'Multiple failed attempts. Account may be locked. Please try forgot password.'
          });
        } else {
          setAuthError({
            type: 'error',
            message: 'Invalid email or password. Please try again.'
          });
        }
        
        addToast({
          type: 'error',
          title: 'Login Failed',
          message: 'Invalid credentials. Please check your email and password.',
        });
      }
      
    } catch (error: any) {
      setAuthError({
        type: 'error',
        message: error.message || 'An unexpected error occurred. Please try again.'
      });
      
      addToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Unable to connect to server. Please check your connection.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorIcon = () => {
    switch (authError?.type) {
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <CheckCircleIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
    }
  };

  const getErrorBgColor = () => {
    switch (authError?.type) {
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
  };

  // Form validation indicators
  const isEmailValid = !errors.email && email && email.length > 0;
  const isPasswordValid = !errors.password && password && password.length >= 6;
  const isFormValid = isEmailValid && isPasswordValid;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md mx-auto"
    >
      {/* Glassmorphism Card */}
      <motion.div
        className="glass-card p-8 relative overflow-hidden"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 dark:from-white/10 dark:to-white/0" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/10 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              className="w-16 h-16 bg-gradient-to-br from-accent to-secondary rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <span className="text-2xl font-bold text-white">AI</span>
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-neutral-200">
              Sign in to access your AI Call Intelligence dashboard
            </p>
          </div>

          {/* Error Alert */}
          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`${getErrorBgColor()} border rounded-xl p-4 mb-6 flex items-start space-x-3`}
              role="alert"
              aria-live="polite"
            >
              {getErrorIcon()}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {authError.message}
                </p>
                {loginAttempts >= 2 && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Need help? <Link to="/forgot-password" className="underline">Reset your password</Link>
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Demo Credentials */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-blue-50/10 border border-blue-200/20 rounded-xl p-4 mb-6"
          >
            <p className="text-xs text-blue-200 font-medium mb-2">Demo Credentials:</p>
            <div className="text-xs text-blue-100 space-y-1">
              <div>Admin: admin@test.com / admin123</div>
              <div>User: user@test.com / user123</div>
            </div>
          </motion.div>

          {/* Login Form */}
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
                rightIcon={isEmailValid ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-400" />
                ) : undefined}
                autoComplete="email"
                aria-describedby="email-error"
              />
            </div>

            {/* Password Field */}
            <div>
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="Enter your password"
                error={errors.password?.message}
                className="bg-white/10 border-white/20 text-white placeholder:text-neutral-300 focus:border-accent focus:ring-accent/50"
                rightIcon={
                  <div className="flex items-center space-x-2">
                    {isPasswordValid && (
                      <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-neutral-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 rounded"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                }
                autoComplete="current-password"
                aria-describedby="password-error"
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  {...register('rememberMe')}
                  type="checkbox"
                  className="w-4 h-4 text-accent border-2 border-white/20 bg-white/10 rounded focus:ring-accent focus:ring-2 focus:ring-offset-0"
                />
                <span className="text-sm text-neutral-200 group-hover:text-white transition-colors">
                  Remember me for 30 days
                </span>
              </label>
              
              <Link
                to="/forgot-password"
                className="text-sm text-accent hover:text-accent-400 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-accent/50 rounded px-1"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || isLoading || !isFormValid}
              className="w-full bg-gradient-to-r from-accent to-accent-600 hover:from-accent-600 hover:to-accent-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:transform-none disabled:opacity-50"
            >
              {isSubmitting || isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>Sign In</span>
                  <motion.div
                    animate={{ x: isFormValid ? 4 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    →
                  </motion.div>
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

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-neutral-200">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-accent hover:text-accent-400 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 rounded px-1"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
      
      {/* Security Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-center"
      >
        <p className="text-xs text-neutral-400">
          Protected by enterprise-grade security.
          <br />
          Your data is encrypted and secure.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default LoginPage;