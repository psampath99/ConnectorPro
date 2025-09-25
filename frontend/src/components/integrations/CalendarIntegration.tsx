import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CheckCircle, AlertCircle, Loader2, Plus, Search, RefreshCw, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CalendarIntegrationProps {
  onConnectionChange?: () => void;
}

interface CalendarConnectionState {
  isConnected: boolean;
  emailAddress: string;
  lastConnected: string;
  scopes: string[];
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  location?: string;
  htmlLink?: string;
}

interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: string;
}

export const CalendarIntegration = ({ onConnectionChange }: CalendarIntegrationProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [connectionState, setConnectionState] = useState<CalendarConnectionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [activeTab, setActiveTab] = useState('status');
  
  // Create event form state
  const [eventForm, setEventForm] = useState({
    summary: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    attendees: '',
    calendarId: 'primary'
  });

  // Load Calendar connection status on component mount
  useEffect(() => {
    checkCalendarStatus();
  }, []);

  const checkCalendarStatus = async () => {
    console.log('🔍 Checking calendar status...');
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/calendar/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        }
      });

      console.log('📡 Calendar status response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Calendar status data:', data);
        
        if (data.status === 'connected') {
          console.log('✅ Calendar is connected, setting state...');
          const newConnectionState = {
            isConnected: true,
            emailAddress: data.email_address,
            lastConnected: data.last_connected,
            scopes: data.scopes || []
          };
          setConnectionState(newConnectionState);
          
          // Load calendars when connected - call after a brief delay to ensure state is updated
          setTimeout(() => {
            loadCalendars();
          }, 100);
        } else {
          console.log('❌ Calendar not connected, status:', data.status);
          setConnectionState({
            isConnected: false,
            emailAddress: '',
            lastConnected: '',
            scopes: []
          });
          if (data.error_message) {
            setError(data.error_message);
          }
        }
      } else {
        console.error('❌ Calendar status request failed:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response data:', errorData);
        
        // Set disconnected state when request fails
        setConnectionState({
          isConnected: false,
          emailAddress: '',
          lastConnected: '',
          scopes: []
        });
        setError(errorData.message || `Failed to check calendar status (${response.status})`);
      }
    } catch (err) {
      console.error('💥 Error checking Calendar status:', err);
      setConnectionState({
        isConnected: false,
        emailAddress: '',
        lastConnected: '',
        scopes: []
      });
      setError('Failed to check Calendar connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendarConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Get authorization URL
      const response = await fetch('http://localhost:8000/api/v1/calendar/auth-url', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get Calendar authorization URL');
      }

      const data = await response.json();
      
      if (data.success && data.auth_url) {
        // Open authorization URL in new window
        const authWindow = window.open(
          data.auth_url,
          'calendar-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        if (!authWindow) {
          throw new Error('Failed to open authorization window. Please allow popups and try again.');
        }

        // Listen for messages from the callback page
        const handleMessage = (event: MessageEvent) => {
          // Only accept messages from our frontend domain
          if (event.origin !== window.location.origin) {
            return;
          }

          if (event.data && event.data.type === 'CALENDAR_AUTH_SUCCESS') {
            // OAuth completed successfully - now exchange the code for tokens
            handleOAuthCallback(event.data.code, event.data.state);
            
            // Close the popup
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }
            
            // Clean up event listener
            window.removeEventListener('message', handleMessage);
          } else if (event.data && event.data.type === 'CALENDAR_AUTH_ERROR') {
            // OAuth failed
            setIsConnecting(false);
            setError(event.data.message || 'Calendar authorization failed');
            
            // Close the popup
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }
            
            // Clean up event listener
            window.removeEventListener('message', handleMessage);
          }
        };

        // Function to handle OAuth callback and exchange code for tokens
        const handleOAuthCallback = async (code: string, state: string) => {
          try {
            const response = await fetch('http://localhost:8000/api/v1/calendar/connect', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
              },
              body: JSON.stringify({
                authorization_code: code,
                redirect_uri: 'http://localhost:5137/calendar/callback'
              })
            });

            const data = await response.json();

            if (data.success) {
              setIsConnecting(false);
              setError(null);
              
              // Refresh the Calendar status to show the connection
              await checkCalendarStatus();
              
              // Notify parent component of connection change
              if (onConnectionChange) {
                onConnectionChange();
              }
            } else {
              throw new Error(data.message || 'Failed to connect Calendar');
            }
          } catch (err) {
            setIsConnecting(false);
            setError(err instanceof Error ? err.message : 'Failed to connect Calendar');
          }
        };

        // Add message listener
        window.addEventListener('message', handleMessage);

        // Fallback: Check if window was closed manually
        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed);
            setIsConnecting(false);
            
            // Clean up event listener
            window.removeEventListener('message', handleMessage);
            
            // Check if connection was successful by refreshing status
            setTimeout(() => {
              checkCalendarStatus();
              // Also notify parent component in case connection was successful
              if (onConnectionChange) {
                onConnectionChange();
              }
            }, 1000);
          }
        }, 1000);

        // Clean up interval after 5 minutes (timeout)
        setTimeout(() => {
          clearInterval(checkClosed);
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
          setIsConnecting(false);
          window.removeEventListener('message', handleMessage);
        }, 300000); // 5 minutes
        
      } else {
        throw new Error(data.message || 'Failed to generate authorization URL');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Calendar');
      setIsConnecting(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/calendar/disconnect', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        }
      });

      if (response.ok) {
        setConnectionState(null);
        setCalendars([]);
        setError(null);
      } else {
        throw new Error('Failed to disconnect Calendar');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Calendar');
    }
  };

  const loadCalendars = async () => {
    console.log('📅 Loading calendars, connectionState:', connectionState);
    
    // Don't check connectionState here since it might not be updated yet
    // The API call will handle authentication
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/v1/calendar/calendars', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        }
      });

      console.log('📅 Calendars response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        throw new Error('Failed to load calendars');
      }

      const data = await response.json();
      console.log('📅 Calendars data:', data);
      setCalendars(data.calendars || []);

    } catch (err) {
      console.error('❌ Error loading calendars:', err);
      setError(err instanceof Error ? err.message : 'Failed to load calendars');
    }
  };

  const handleCreateEvent = async () => {
    if (!connectionState?.isConnected) {
      setError('Calendar not connected');
      return;
    }

    if (!eventForm.summary || !eventForm.startDate || !eventForm.startTime || !eventForm.endDate || !eventForm.endTime) {
      setError('Please fill in all required fields (Title, Start Date/Time, End Date/Time)');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Format dates for Google Calendar API
      const startDateTime = `${eventForm.startDate}T${eventForm.startTime}:00`;
      const endDateTime = `${eventForm.endDate}T${eventForm.endTime}:00`;

      const eventData: any = {
        summary: eventForm.summary,
        description: eventForm.description,
        location: eventForm.location,
        start: {
          dateTime: startDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        calendar_id: eventForm.calendarId
      };

      // Add attendees if provided
      if (eventForm.attendees.trim()) {
        const attendeeEmails = eventForm.attendees.split(',').map(email => email.trim()).filter(email => email);
        eventData.attendees = attendeeEmails.map(email => ({ email }));
      }

      const response = await fetch('http://localhost:8000/api/v1/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        },
        body: JSON.stringify(eventData)
      });

      const data = await response.json();

      if (data.success) {
        // Clear form on success
        setEventForm({
          summary: '',
          description: '',
          location: '',
          startDate: '',
          startTime: '',
          endDate: '',
          endTime: '',
          attendees: '',
          calendarId: 'primary'
        });
        setActiveTab('status'); // Switch to status tab
        setError(null);
        // Show success message
        alert('Event created successfully!');
      } else {
        throw new Error(data.message || 'Failed to create event');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            <span>Google Calendar Integration</span>
            {connectionState?.isConnected && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
          </CardTitle>
          {connectionState?.isConnected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnectCalendar}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Disconnect
            </Button>
          )}
        </div>
        {connectionState?.isConnected && (
          <div className="mt-3 text-sm text-green-700">
            <p>Connected as: {connectionState.emailAddress}</p>
            <p>Last connected: {formatDate(connectionState.lastConnected)}</p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Checking calendar connection...</span>
          </div>
        ) : !connectionState?.isConnected ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect your Google Calendar to schedule meetings, create events, and manage your calendar directly from ConnectorPro.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Required Permissions</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• View and manage your calendars</li>
                <li>• Create and edit events</li>
                <li>• Access basic account information</li>
              </ul>
            </div>
            <Button 
              onClick={handleCalendarConnect}
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting to Google Calendar...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="calendars">Calendars</TabsTrigger>
              <TabsTrigger value="create">Create Event</TabsTrigger>
            </TabsList>
            
            <TabsContent value="status" className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Connection Status</h4>
                <div className="text-sm text-green-800 space-y-1">
                  <p>✅ Google Calendar connected successfully</p>
                  <p>📧 Email: {connectionState.emailAddress}</p>
                  <p>🔐 Permissions: {connectionState.scopes.length} scopes granted</p>
                  <p>⏰ Connected: {formatDate(connectionState.lastConnected)}</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => setActiveTab('calendars')}
                  className="flex-1"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  View Calendars
                </Button>
                <Button
                  onClick={() => setActiveTab('create')}
                  variant="outline"
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="calendars" className="space-y-4">
              <div className="flex space-x-2">
                <Button onClick={loadCalendars} disabled={isLoading} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Calendars
                </Button>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Loading calendars...
                </div>
              ) : calendars.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {calendars.map((calendar) => (
                    <div
                      key={calendar.id}
                      className="border rounded-lg p-3 bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-medium truncate">
                              {calendar.summary}
                            </h4>
                            {calendar.primary && (
                              <Badge variant="secondary" className="text-xs">Primary</Badge>
                            )}
                          </div>
                          {calendar.description && (
                            <p className="text-xs text-gray-600 truncate">
                              {calendar.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Access: {calendar.accessRole}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No calendars found</p>
                  <Button
                    onClick={loadCalendars}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Load Calendars
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="create" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Event Title *</label>
                  <Input
                    placeholder="Meeting with John Doe"
                    value={eventForm.summary}
                    onChange={(e) => setEventForm(prev => ({ ...prev, summary: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Event description..."
                    value={eventForm.description}
                    onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    placeholder="Conference Room A or Zoom link"
                    value={eventForm.location}
                    onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Date *</label>
                    <Input
                      type="date"
                      value={eventForm.startDate}
                      onChange={(e) => setEventForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Start Time *</label>
                    <Input
                      type="time"
                      value={eventForm.startTime}
                      onChange={(e) => setEventForm(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">End Date *</label>
                    <Input
                      type="date"
                      value={eventForm.endDate}
                      onChange={(e) => setEventForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Time *</label>
                    <Input
                      type="time"
                      value={eventForm.endTime}
                      onChange={(e) => setEventForm(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Attendees</label>
                  <Input
                    placeholder="email1@example.com, email2@example.com"
                    value={eventForm.attendees}
                    onChange={(e) => setEventForm(prev => ({ ...prev, attendees: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Calendar</label>
                  <Select
                    value={eventForm.calendarId}
                    onValueChange={(value) => setEventForm(prev => ({ ...prev, calendarId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary Calendar</SelectItem>
                      {calendars.map((calendar) => (
                        <SelectItem key={calendar.id} value={calendar.id}>
                          {calendar.summary}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  onClick={handleCreateEvent}
                  disabled={isCreating || !eventForm.summary || !eventForm.startDate || !eventForm.startTime || !eventForm.endDate || !eventForm.endTime}
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Event...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Event
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default CalendarIntegration;