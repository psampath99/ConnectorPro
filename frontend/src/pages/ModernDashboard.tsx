import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const ModernDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-foreground mb-4">
        Welcome back, {user?.name}!
      </h1>
      <p className="text-muted-foreground mb-8">
        Here's a placeholder for your dashboard. More features coming soon!
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Imported Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Placeholder for imported contacts.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Placeholder for onboarding information.
            </p>
          </CardContent>
        </Card>
        
        <Card>
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