import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  CheckCircleIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { Button, Input } from '@/components/ui';
import { useUIStore } from '@/store';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  role: z.enum(['user', 'admin', 'manager'], { 
    errorMap: () => ({ message: 'Please select a role' }) 
  }),
  company: z.string().min(2, 'Company name is required'),
  terms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: 'Very Weak',
    color: 'bg-red-500'
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');
  const name = watch('name');
  const email = watch('email');
  const role = watch('role');
  const company = watch('company');

  // Calculate password strength
  React.useEffect(() => {
    if (password) {
      let score = 0;
      let label = 'Very Weak';
      let color = 'bg-red-500';

      if (password.length >= 8) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[a-z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++;

      switch (score) {
        case 0:
        case 1:
          label = 'Very Weak';
          color = 'bg-red-500';
          break;
        case 2:
          label = 'Weak';
          color = 'bg-orange-500';
          break;
        case 3:
          label = 'Fair';
          color = 'bg-yellow-500';
          break;
        case 4:
          label = 'Good';
          color = 'bg-blue-500';
          break;
        case 5:
          label = 'Strong';
          color = 'bg-green-500';
          break;
      }

      setPasswordStrength({ score, label, color });
    } else {
      setPasswordStrength({ score: 0, label: 'Very Weak', color: 'bg-red-500' });
    }
  }, [password]);

  const onSubmit = async (data: SignupFormData) => {
    try {
      setIsLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock signup success
      addToast({
        type: 'success',
        title: 'Account Created!',
        message: 'Please check your email to verify your account.',
      });
      
      // Redirect to email verification page
      navigate('/email-verification', { 
        state: { 
          email: data.email, 
          name: data.name 
        } 
      });
      
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Signup Failed',
        message: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Form validation indicators
  const isNameValid = !errors.name && name && name.length >= 2;
  const isEmailValid = !errors.email && email && email.includes('@');
  const isPasswordValid = !errors.password && passwordStrength.score >= 4;
  const isConfirmPasswordValid = !errors.confirmPassword && confirmPassword === password && password;
  const isRoleSelected = !errors.role && role;
  const isCompanyValid = !errors.company && company && company.length >= 2;
  const isFormValid = isNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid && isRoleSelected && isCompanyValid;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-lg mx-auto"
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
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              className="w-16 h-16 bg-gradient-to-br from-secondary to-accent rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
              initial={{ rotate: 10 }}
              animate={{ rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <span className="text-2xl font-bold text-white">AI</span>
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Create Account
            </h1>
            <p className="text-neutral-200">
              Join AI Call Intelligence platform
            </p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* Name Field */}
            <div>
              <Input
                {...register('name')}
                type="text"
                label="Full Name"
                placeholder="Enter your full name"
                error={errors.name?.message}
                className="bg-white/10 border-white/20 text-white placeholder:text-neutral-300 focus:border-accent focus:ring-accent/50"
                leftIcon={<UserCircleIcon className="w-5 h-5 text-neutral-400" />}
                rightIcon={isNameValid ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-400" />
                ) : undefined}
                autoComplete="name"
              />
            </div>

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
              />
            </div>

            {/* Company and Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  {...register('company')}
                  type="text"
                  label="Company"
                  placeholder="Company name"
                  error={errors.company?.message}
                  className="bg-white/10 border-white/20 text-white placeholder:text-neutral-300 focus:border-accent focus:ring-accent/50"
                  leftIcon={<BuildingOfficeIcon className="w-5 h-5 text-neutral-400" />}
                  rightIcon={isCompanyValid ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  ) : undefined}
                  autoComplete="organization"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Role
                </label>
                <div className="relative">
                  <select
                    {...register('role')}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200 appearance-none"
                  >
                    <option value="" className="text-neutral-900">Select your role</option>
                    <option value="user" className="text-neutral-900">User</option>
                    <option value="manager" className="text-neutral-900">Manager</option>
                    <option value="admin" className="text-neutral-900">Administrator</option>
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    {isRoleSelected ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    ) : (
                      <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                </div>
                {errors.role && (
                  <p className="text-sm text-red-300 mt-1">{errors.role.message}</p>
                )}
              </div>
            </div>

            {/* Password Field */}
            <div>
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="Create a strong password"
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
                      className="text-neutral-300 hover:text-white transition-colors focus:outline-none"
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
                autoComplete="new-password"
              />
              
              {/* Password Strength Indicator */}
              {password && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3"
                >
                  <div className="flex items-center justify-between text-xs text-neutral-300 mb-1">
                    <span>Password Strength</span>
                    <span className={`font-medium ${
                      passwordStrength.score >= 4 ? 'text-green-400' : 
                      passwordStrength.score >= 3 ? 'text-yellow-400' : 
                      'text-red-400'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-neutral-400 space-y-1">
                    <div className={password.length >= 8 ? 'text-green-400' : ''}>
                      ✓ At least 8 characters
                    </div>
                    <div className={/[A-Z]/.test(password) ? 'text-green-400' : ''}>
                      ✓ One uppercase letter
                    </div>
                    <div className={/[a-z]/.test(password) ? 'text-green-400' : ''}>
                      ✓ One lowercase letter
                    </div>
                    <div className={/[0-9]/.test(password) ? 'text-green-400' : ''}>
                      ✓ One number
                    </div>
                    <div className={/[^A-Za-z0-9]/.test(password) ? 'text-green-400' : ''}>
                      ✓ One special character
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <Input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                label="Confirm Password"
                placeholder="Re-enter your password"
                error={errors.confirmPassword?.message}
                className="bg-white/10 border-white/20 text-white placeholder:text-neutral-300 focus:border-accent focus:ring-accent/50"
                rightIcon={
                  <div className="flex items-center space-x-2">
                    {isConfirmPasswordValid && (
                      <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-neutral-300 hover:text-white transition-colors focus:outline-none"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                }
                autoComplete="new-password"
              />
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-3">
              <label className="flex items-start space-x-3 cursor-pointer group">
                <input
                  {...register('terms')}
                  type="checkbox"
                  className="mt-1 w-4 h-4 text-accent border-2 border-white/20 bg-white/10 rounded focus:ring-accent focus:ring-2"
                />
                <div className="flex-1 text-sm text-neutral-200 leading-relaxed">
                  <span className="group-hover:text-white transition-colors">
                    I agree to the{' '}
                    <Link to="/terms" className="text-accent hover:text-accent-400 underline" target="_blank">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link to="/privacy" className="text-accent hover:text-accent-400 underline" target="_blank">
                      Privacy Policy
                    </Link>
                  </span>
                </div>
              </label>
              {errors.terms && (
                <p className="text-sm text-red-300 ml-7">{errors.terms.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || isLoading || !isFormValid}
              className="w-full bg-gradient-to-r from-secondary to-accent hover:from-secondary-600 hover:to-accent-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:transform-none disabled:opacity-50"
            >
              {isSubmitting || isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Creating account...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <ShieldCheckIcon className="w-5 h-5" />
                  <span>Create Account</span>
                </div>
              )}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-8 text-center">
            <p className="text-neutral-200">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-accent hover:text-accent-400 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 rounded px-1"
              >
                Sign In
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
          🔒 Your information is secured with enterprise-grade encryption.
          <br />
          We never share your data with third parties.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default SignupPage;