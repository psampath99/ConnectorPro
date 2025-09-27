import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { CheckCircle } from 'lucide-react';

const ModernDashboard = () => {
  const { user } = useAuth();

  // Mock data for demonstration
  const onboardingSteps = [
    { name: 'Create Account', completed: true },
    { name: 'Import Contacts', completed: true },
    { name: 'Connect Calendar', completed: false },
    { name: 'Set Preferences', completed: false },
  ];

  const completedSteps = onboardingSteps.filter(step => step.completed).length;
  const totalSteps = onboardingSteps.length;
  const onboardingProgress = (completedSteps / totalSteps) * 100;

  const importedContacts = 125; // Mock data

  return (
    <div className="p-8 bg-background text-foreground">
      <h1 className="text-3xl font-bold mb-4">
        Welcome back, {user?.name || 'User'}!
      </h1>
      <p className="text-muted-foreground mb-8">
        Here’s a snapshot of your professional network and onboarding progress.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Imported Contacts Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Imported Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{importedContacts}</p>
            <p className="text-muted-foreground mb-4">
              contacts successfully imported.
            </p>
            <Button asChild variant="outline">
              <Link to="/contacts">Manage Contacts</Link>
            </Button>
          </CardContent>
        </Card>
        
        {/* Onboarding Information Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Onboarding Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Progress value={onboardingProgress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">
                {completedSteps} of {totalSteps} steps completed
              </p>
            </div>
            <ul className="space-y-2">
              {onboardingSteps.map((step, index) => (
                <li key={index} className={`flex items-center ${step.completed ? 'text-green-500' : 'text-muted-foreground'}`}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {step.name}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        {/* Profile Settings Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Manage your profile and account settings.
            </p>
            <Button asChild>
              <Link to="/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModernDashboard;