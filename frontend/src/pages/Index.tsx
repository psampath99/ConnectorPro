import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Sidebar } from '@/components/layout/Sidebar';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { FloatingAIButton } from '@/components/ui/floating-ai-button';
import { storage } from '@/lib/storage';
import { User } from '@/types';
import { 
  mockUser, 
  mockContacts, 
  mockRecommendations, 
  mockDrafts, 
  mockTasks, 
  mockMeetings,
  mockActivities
} from '@/lib/mockData';

const Index = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has completed onboarding
    const onboardingComplete = localStorage.getItem('connectorpro_onboarding_complete');
    const existingUser = storage.getUser();

    if (!onboardingComplete || !existingUser) {
      setShowOnboarding(true);
    } else {
      // Initialize mock data for existing users
      storage.initializeMockData({
        user: existingUser,
        contacts: mockContacts,
        recommendations: mockRecommendations,
        drafts: mockDrafts,
        tasks: mockTasks,
        meetings: mockMeetings,
        activities: mockActivities
      });

      // Ensure target companies are set if not already
      const targetCompanies = localStorage.getItem('connectorpro_target_companies');
      if (!targetCompanies) {
        // Set default target companies based on the contacts we have
        const defaultTargetCompanies = ['Meta', 'Stripe', 'Airbnb'];
        localStorage.setItem('connectorpro_target_companies', JSON.stringify(defaultTargetCompanies));
      }
    }
    
    setIsLoading(false);
  }, []);

  const handleOnboardingComplete = (user: User) => {
    // Initialize mock data with the new user
    storage.initializeMockData({
      user,
      contacts: mockContacts,
      recommendations: mockRecommendations,
      drafts: mockDrafts,
      tasks: mockTasks,
      meetings: mockMeetings,
      activities: mockActivities
    });
    
    setShowOnboarding(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading ConnectorPro...</p>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 relative">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Dashboard />
        </div>
      </main>
      
      <FloatingAIButton />
    </div>
  );
};

export default Index;