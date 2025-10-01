import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Network, Eye, EyeOff } from 'lucide-react';
import { User } from '@/types';
import { storage } from '@/lib/storage';
import { Step1_UserProfile, Step1UserProfileData } from './Step1_UserProfile';
import { Step3_FinalSteps } from './Step3_FinalSteps';

interface UnifiedOnboardingData {
  // Page 1 Data
  persona: User['role'] | '';
  firstName: string;
  lastName: string;
  email: string;
  linkedinProfileUrl: string;
  networkingGoals: string[];
  targetCompanies: string[];
  
  // Page 2 Data (integrations - will be handled in settings)
  linkedinConnected: boolean;
  emailConnected: boolean;
  calendarConnected: boolean;
  csvUploaded: boolean;
  csvImportResult: any;
  uploadedFiles: any[];
  
  // Page 3 Data
  draftTone: 'professional' | 'friendly' | 'concise';
  commonalityOrder: ('employer' | 'education' | 'mutual' | 'event')[];
}

interface OnboardingFlowProps {
  onComplete: (userData: User) => void;
}

// MOVED OUTSIDE to prevent re-rendering issues that cause focus loss
const PasswordCreationStep = ({
  data,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  passwordError,
  handlePasswordCreation,
  setCurrentStep,
}: {
  data: UnifiedOnboardingData;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (value: boolean) => void;
  passwordError: string;
  handlePasswordCreation: () => void;
  setCurrentStep: (step: number) => void;
}) => (
  <div className="space-y-6">
    <div className="text-center">
      <h3 className="text-lg font-semibold mb-2">Create Your Password</h3>
      <p className="text-gray-600">Set a secure password for your ConnectorPro account</p>
      <p className="text-sm text-gray-500 mt-2">
        Your email: <span className="font-medium">{data.email}</span>
      </p>
    </div>

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              console.log('🔍 Password input onChange:', e.target.value);
              setPassword(e.target.value);
            }}
            onFocus={() => console.log('🔍 Password input focused')}
            onBlur={() => console.log('🔍 Password input blurred')}
            placeholder="Enter your password"
            className="pr-12"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔍 Password toggle clicked');
              setShowPassword(!showPassword);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-50 rounded-r-md"
            style={{ width: '40px' }}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Password must be at least 8 characters long
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Confirm Password
        </label>
        <div className="relative">
          <Input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => {
              console.log('🔍 Confirm password input onChange:', e.target.value);
              setConfirmPassword(e.target.value);
            }}
            onFocus={() => console.log('🔍 Confirm password input focused')}
            onBlur={() => console.log('🔍 Confirm password input blurred')}
            placeholder="Confirm your password"
            className="pr-12"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔍 Confirm password toggle clicked');
              setShowConfirmPassword(!showConfirmPassword);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-50 rounded-r-md"
            style={{ width: '40px' }}
            tabIndex={-1}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {passwordError && (
        <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
          {passwordError}
        </div>
      )}
    </div>

    <div className="bg-green-50 rounded-lg p-4">
      <h4 className="font-medium text-green-900 mb-2">Almost done! 🎉</h4>
      <p className="text-sm text-green-800">
        After creating your password, you'll be taken to your settings page where you can
        complete your profile and set up your integrations (LinkedIn, Gmail, Calendar).
      </p>
    </div>

    {/* Navigation Buttons */}
    <div className="flex justify-between pt-6 border-t">
      <Button variant="outline" onClick={() => setCurrentStep(2)}>
        Back
      </Button>
      <Button
        onClick={handlePasswordCreation}
        disabled={!password || !confirmPassword}
        className="bg-green-600 hover:bg-green-700"
      >
        Create Account
      </Button>
    </div>
  </div>
);

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<UnifiedOnboardingData>({
    // Page 1 Data
    persona: '',
    firstName: '',
    lastName: '',
    email: '',
    linkedinProfileUrl: '',
    networkingGoals: [],
    targetCompanies: [],
    
    // Page 2 Data (integrations will be handled in settings)
    linkedinConnected: false,
    emailConnected: false,
    calendarConnected: false,
    csvUploaded: false,
    csvImportResult: null,
    uploadedFiles: [],
    
    // Page 3 Data
    draftTone: 'professional',
    commonalityOrder: ['employer', 'education', 'mutual', 'event']
  });

  // Password creation state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const totalSteps = 3;

  const handleStep1Complete = (step1Data: Step1UserProfileData) => {
    console.log('Step 1 completed with data:', step1Data);
    
    // Update the unified data with Step 1 data
    setData(prev => ({
      ...prev,
      persona: step1Data.persona,
      firstName: step1Data.firstName,
      lastName: step1Data.lastName,
      email: step1Data.email,
      linkedinProfileUrl: step1Data.linkedinProfileUrl,
      networkingGoals: step1Data.networkingGoals,
      targetCompanies: step1Data.targetCompanies
    }));
    
    setCurrentStep(2); // Move to Final Steps (previously step 3)
  };

  const handleStep2Complete = () => {
    console.log('Step 2 (Final Steps) completed, moving to password creation');
    setCurrentStep(3);
  };

  const handleStep2Back = () => {
    setCurrentStep(1);
  };

  const validatePassword = () => {
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handlePasswordCreation = async () => {
    if (!validatePassword()) {
      return;
    }

    console.log('🔍 [DEBUG] Password creation started');
    console.log('🔍 [DEBUG] Email:', data.email);
    console.log('🔍 [DEBUG] Password length:', password.length);
    
    try {
      // First, register the user with the backend
      console.log('🔍 [DEBUG] Attempting to register user with backend...');
      
      const registerResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${data.firstName} ${data.lastName}`.trim(),
          email: data.email,
          password: password
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json().catch(() => ({}));
        console.error('🔍 [DEBUG] Backend registration failed:', errorData);
        
        // Handle FastAPI validation errors (422)
        if (registerResponse.status === 422 && errorData.detail && Array.isArray(errorData.detail)) {
          const validationErrors = errorData.detail.map((error: any) => {
            if (error.msg) {
              return error.msg;
            }
            return `${error.loc?.join(' ')} - ${error.msg || 'Validation error'}`;
          }).join('. ');
          
          throw new Error(validationErrors || 'Please check your input and try again.');
        }
        
        throw new Error(errorData.detail || 'Registration failed');
      }

      const registerData = await registerResponse.json();
      console.log('🔍 [DEBUG] Backend registration successful:', registerData);

      // Create user object from collected data
      const user: User = {
        id: registerData.user?.id || `user-${Date.now()}`,
        email: data.email,
        name: `${data.firstName} ${data.lastName}`.trim(),
        role: data.persona as User['role'],
        createdAt: new Date(),
        preferences: {
          commonalityOrder: data.commonalityOrder,
          draftTone: data.draftTone,
          reminderFrequency: 7
        }
      };

      // Store user data and onboarding data using centralized storage
      storage.setUser(user);
      
      // Store authentication token if provided
      if (registerData.access_token) {
        localStorage.setItem('connectorpro_token', registerData.access_token);
        localStorage.setItem('connectorpro_user', JSON.stringify(registerData.user));
        if (registerData.expires_in) {
          const expiryTime = new Date().getTime() + (registerData.expires_in * 1000);
          localStorage.setItem('connectorpro_token_expiry', expiryTime.toString());
        }
        console.log('🔍 [DEBUG] Authentication tokens stored');
      }
      
      // Store onboarding data in the format expected by the existing system
      const onboardingDataForStorage = {
        persona: data.persona,
        name: `${data.firstName} ${data.lastName}`.trim(),
        email: data.email,
        linkedinProfileUrl: data.linkedinProfileUrl,
        primaryGoal: data.networkingGoals[0] || '', // Use first goal as primary
        networkingGoals: data.networkingGoals,
        targetCompanies: data.targetCompanies,
        linkedinConnected: data.linkedinConnected,
        emailConnected: data.emailConnected,
        calendarConnected: data.calendarConnected,
        csvUploaded: data.csvUploaded,
        csvImportResult: data.csvImportResult,
        uploadedFiles: data.uploadedFiles,
        draftTone: data.draftTone,
        commonalityOrder: data.commonalityOrder
      };
      
      storage.setOnboardingData(onboardingDataForStorage, 'gmail'); // Default email provider
      console.log('🔍 [DEBUG] ✅ User registered with backend and onboarding data saved');
      
      // Navigate to settings page after account creation (as per requirements: New users → Settings page)
      navigate('/settings', { replace: true });
      
      onComplete(user);
      
    } catch (error) {
      console.error('🔍 [DEBUG] ❌ Registration error:', error);
      setPasswordError(`Registration failed: ${error.message}`);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1_UserProfile
            onComplete={handleStep1Complete}
            onCancel={() => {
              // Handle cancel if needed
              console.log('Step 1 cancelled');
            }}
          />
        );
      case 2:
        return (
          <Step3_FinalSteps
            onComplete={handleStep2Complete}
            onBack={handleStep2Back}
          />
        );
      case 3:
        return (
          <PasswordCreationStep
            data={data}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            passwordError={passwordError}
            handlePasswordCreation={handlePasswordCreation}
            setCurrentStep={setCurrentStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Network className="w-7 h-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {currentStep === 3 ? 'Create Your Account' : 'Welcome to ConnectorPro'}
          </CardTitle>
          <p className="text-gray-600">
            {currentStep === 3 
              ? 'Set your password to complete your account setup'
              : "Let's set up your AI-powered networking assistant"
            }
          </p>
          
          {/* Progress Bar */}
          <div className="flex items-center justify-center mt-6 space-x-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i + 1 <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">Step {currentStep} of {totalSteps}</p>
        </CardHeader>

        <CardContent>
          {renderCurrentStep()}
        </CardContent>
      </Card>
    </div>
  );
}