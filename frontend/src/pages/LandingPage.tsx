import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Network } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
          <Network className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-5xl font-bold text-foreground tracking-tight">
          ConnectorPro
        </h1>
      </div>
      <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
        Stay organized, stay ahead — every email, call, and meeting with target companies in a single view.  Never miss a message or meeting.
      </p>
      <Button asChild size="lg">
        <Link to="/login">Log In</Link>
      </Button>
    </div>
  );
};

export default LandingPage;