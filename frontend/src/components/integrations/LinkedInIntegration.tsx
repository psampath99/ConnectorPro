import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Linkedin, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { storage } from '@/lib/storage';

interface LinkedInIntegrationProps {
  onContactsImported?: (contacts: any[]) => void;
}

interface LinkedInConnectionState {
  isConnected: boolean;
  lastImportDate: string;
  contactCount: number;
  accessToken: string;
}

export const LinkedInIntegration = ({ onContactsImported }: LinkedInIntegrationProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [lastImportDate, setLastImportDate] = useState<string | null>(null);
  const [contactCount, setContactCount] = useState<number>(0);

  // Load persistent LinkedIn connection state on component mount
  useEffect(() => {
    const linkedinState = getLinkedInConnectionState();
    if (linkedinState) {
      setIsConnected(linkedinState.isConnected);
      setAccessToken(linkedinState.accessToken);
      setLastImportDate(linkedinState.lastImportDate);
      setContactCount(linkedinState.contactCount);
    }
  }, []);

  const getLinkedInConnectionState = (): LinkedInConnectionState | null => {
    try {
      const state = localStorage.getItem('connectorpro_linkedin_connection');
      return state ? JSON.parse(state) : null;
    } catch {
      return null;
    }
  };

  const saveLinkedInConnectionState = (state: LinkedInConnectionState) => {
    localStorage.setItem('connectorpro_linkedin_connection', JSON.stringify(state));
  };

  const clearLinkedInConnectionState = () => {
    localStorage.removeItem('connectorpro_linkedin_connection');
  };

  const handleLinkedInConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Check RapidAPI LinkedIn Scraper status
      const response = await fetch('http://localhost:8000/api/v1/linkedin/rapidapi/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to connect to LinkedIn API service');
      }

      const data = await response.json();
      
      if (data.status === 'configured') {
        // RapidAPI is configured, simulate successful connection
        const token = 'rapidapi-configured';
        setIsConnected(true);
        setAccessToken(token);
        
        // Save persistent connection state
        saveLinkedInConnectionState({
          isConnected: true,
          lastImportDate: new Date().toISOString(),
          contactCount: 0,
          accessToken: token
        });
        
        setIsConnecting(false);
      } else {
        throw new Error(data.message || 'LinkedIn API service not properly configured');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to LinkedIn');
      setIsConnecting(false);
    }
  };

  const handleImportContacts = async (overwriteExisting = false) => {
    if (!accessToken) {
      setError('LinkedIn connection not established');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      // If overwriting, clear existing LinkedIn contacts from MongoDB first
      if (overwriteExisting) {
        console.log('🔄 Overwriting existing LinkedIn contacts...');
        // Clear existing LinkedIn contacts from storage
        const existingContacts = storage.getContacts();
        const nonLinkedInContacts = existingContacts.filter(contact =>
          !contact.tags?.includes('linkedin-import') && !contact.tags?.includes('csv-import')
        );
        storage.setContacts(nonLinkedInContacts);
      }

      // Import LinkedIn connections using the bulk import endpoint
      const response = await fetch('http://localhost:8000/api/v1/contacts/import/linkedin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        },
        body: JSON.stringify({
          accessToken: accessToken,
          count: 500, // Import up to 500 connections at once
          lastImportDate: overwriteExisting ? null : lastImportDate // Only get new contacts if not overwriting
        })
      });

      if (!response.ok) {
        throw new Error('Failed to import LinkedIn contacts');
      }

      const result = await response.json();
      setImportResult(result);
      
      // Store LinkedIn contacts to localStorage for dashboard access
      if (result.contacts && result.contacts.length > 0) {
        console.log('Processing LinkedIn contacts for localStorage:', result.contacts.length);
        
        const formattedContacts = result.contacts.map((contact: any) => ({
          id: contact.id,
          name: contact.name,
          title: contact.title,
          company: contact.company,
          email: contact.email || '',
          linkedinUrl: contact.linkedinUrl || '',
          degree: contact.degree,
          relationshipStrength: contact.relationshipStrength,
          commonalities: contact.commonalities || [],
          notes: contact.notes || '',
          tags: contact.tags || [],
          addedAt: new Date(contact.createdAt || new Date()),
          linkedinData: contact.linkedinData || {}
        }));
        
        console.log('Formatted LinkedIn contacts:', formattedContacts);
        
        // Add to existing contacts in localStorage (or replace if overwriting)
        const existingContacts = storage.getContacts();
        console.log('Existing contacts in localStorage:', existingContacts.length);
        
        const allContacts = [...existingContacts, ...formattedContacts];
        storage.setContacts(allContacts);
        
        console.log(`✅ Saved ${formattedContacts.length} LinkedIn contacts to localStorage. Total contacts now: ${allContacts.length}`);
        
        // Update persistent LinkedIn connection state
        const currentDate = new Date().toISOString();
        const newContactCount = formattedContacts.length;
        
        saveLinkedInConnectionState({
          isConnected: true,
          lastImportDate: currentDate,
          contactCount: newContactCount,
          accessToken: accessToken
        });
        
        setLastImportDate(currentDate);
        setContactCount(newContactCount);
        
        // Store LinkedIn import state for persistence
        storage.setCsvUploadState({
          success: true,
          message: result.message,
          imported: result.imported,
          total: result.total,
          contacts: formattedContacts,
          source: 'linkedin'
        }, 'LinkedIn Import');
      }
      
      if (onContactsImported) {
        onContactsImported(result.contacts);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import contacts');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDisconnectLinkedIn = () => {
    setIsConnected(false);
    setAccessToken(null);
    setLastImportDate(null);
    setContactCount(0);
    setImportResult(null);
    clearLinkedInConnectionState();
  };

  // Handle OAuth callback (this would typically be handled by a separate callback page)
  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      const response = await fetch('/api/v1/integrations/linkedin/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ code, state })
      });

      if (!response.ok) {
        throw new Error('Failed to complete LinkedIn integration');
      }

      const data = await response.json();
      setAccessToken(data.accessToken);
      setIsConnected(true);
      setIsConnecting(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete LinkedIn integration');
      setIsConnecting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Linkedin className="w-6 h-6 text-blue-600" />
          <span>LinkedIn Integration</span>
          {isConnected && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isConnected ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect your LinkedIn account to import your network and discover networking opportunities.
            </p>
            <Button 
              onClick={handleLinkedInConnect}
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting to LinkedIn...
                </>
              ) : (
                <>
                  <Linkedin className="w-4 h-4 mr-2" />
                  Connect LinkedIn Account
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800 font-medium">LinkedIn Connected!</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnectLinkedIn}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Disconnect
                </Button>
              </div>
              {lastImportDate && (
                <div className="mt-2 text-sm text-green-700">
                  <p>Last imported: {new Date(lastImportDate).toLocaleString()}</p>
                  <p>{contactCount} contacts imported</p>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() => handleImportContacts(false)}
                disabled={isImporting}
                className="flex-1"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Linkedin className="w-4 h-4 mr-2" />
                    Import New
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => handleImportContacts(true)}
                disabled={isImporting}
                variant="outline"
                className="flex-1"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Overwriting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Overwrite All
                  </>
                )}
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <p><strong>Import New:</strong> Only imports contacts added since last import</p>
                <p><strong>Overwrite All:</strong> Replaces all existing LinkedIn contacts</p>
              </div>
            </div>

            {importResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Import Results</h4>
                <div className="text-sm text-blue-800">
                  <p>✅ Successfully imported {importResult.imported} contacts</p>
                  <p>📊 Total LinkedIn connections: {importResult.total}</p>
                  {importResult.imported < importResult.total && (
                    <p className="text-blue-600 mt-1">
                      Note: {importResult.total - importResult.imported} contacts were skipped (likely duplicates)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LinkedInIntegration;