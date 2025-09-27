import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, CheckCircle, AlertCircle, Loader2, Send, Search, RefreshCw, ExternalLink, Bot, Building2, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToolOriginatedBadgeComponent } from '@/components/ui/tool-originated-badge';
import { EnhancedGmailResponse, GmailEmail } from '@/types';

interface GmailIntegrationProps {
  onEmailsLoaded?: (emails: GmailEmail[]) => void;
  onConnectionChange?: () => void;
}

interface GmailConnectionState {
  isConnected: boolean;
  emailAddress: string;
  lastConnected: string;
  scopes: string[];
}

export const GmailIntegration = ({ onEmailsLoaded, onConnectionChange }: GmailIntegrationProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [connectionState, setConnectionState] = useState<GmailConnectionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('status');
  
  // Send email form state
  const [sendForm, setSendForm] = useState({
    to: '',
    subject: '',
    body: '',
    bodyType: 'text' as 'text' | 'html',
    cc: '',
    bcc: ''
  });

  // Load Gmail connection status on component mount
  useEffect(() => {
    checkGmailStatus();
  }, []);

  const checkGmailStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/gmail/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'connected') {
          setConnectionState({
            isConnected: true,
            emailAddress: data.email_address,
            lastConnected: data.last_connected,
            scopes: data.scopes || []
          });
        } else {
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
      }
    } catch (err) {
      console.error('Error checking Gmail status:', err);
      setError('Failed to check Gmail connection status');
    }
  };

  const handleGmailConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Get authorization URL
      const response = await fetch('http://localhost:8000/api/v1/gmail/auth-url', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get Gmail authorization URL');
      }

      const data = await response.json();
      
      if (data.success && data.auth_url) {
        // Open authorization URL in new window
        const authWindow = window.open(
          data.auth_url,
          'gmail-auth',
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

          if (event.data && event.data.type === 'GMAIL_AUTH_SUCCESS') {
            // OAuth completed successfully
            setIsConnecting(false);
            setError(null);
            
            // Close the popup
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }
            
            // Refresh the Gmail status to show the connection
            checkGmailStatus();
            
            // Notify parent component of connection change
            if (onConnectionChange) {
              onConnectionChange();
            }
            
            // Clean up event listener
            window.removeEventListener('message', handleMessage);
          } else if (event.data && event.data.type === 'GMAIL_AUTH_ERROR') {
            // OAuth failed
            setIsConnecting(false);
            setError(event.data.message || 'Gmail authorization failed');
            
            // Close the popup
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }
            
            // Clean up event listener
            window.removeEventListener('message', handleMessage);
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
              checkGmailStatus();
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
      setError(err instanceof Error ? err.message : 'Failed to connect to Gmail');
      setIsConnecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/gmail/disconnect', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        }
      });

      if (response.ok) {
        setConnectionState(null);
        setEmails([]);
        setError(null);
      } else {
        throw new Error('Failed to disconnect Gmail');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Gmail');
    }
  };

  const handleLoadEmails = async (query: string = '') => {
    if (!connectionState?.isConnected) {
      setError('Gmail not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get target companies from localStorage
      const targetCompaniesStr = localStorage.getItem('connectorpro_target_companies');
      let targetCompanies = ['Meta', 'Stripe', 'Airbnb']; // Default fallback
      
      if (targetCompaniesStr) {
        try {
          targetCompanies = JSON.parse(targetCompaniesStr);
        } catch (error) {
          console.error('Error parsing target companies:', error);
        }
      }

      // Use the enhanced target company filtering endpoint
      const params = new URLSearchParams({
        target_companies: targetCompanies.join(','),
        max_results: '20'
      });

      const response = await fetch(`http://localhost:8000/api/v1/gmail/emails/by-companies?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load emails from target companies');
      }

      const data: EnhancedGmailResponse = await response.json();
      
      // Combine company-matched emails and tool-originated emails
      const allEmails: GmailEmail[] = [];
      
      // Add company-matched emails
      if (data.emails_by_company) {
        Object.entries(data.emails_by_company).forEach(([company, companyEmails]) => {
          if (Array.isArray(companyEmails)) {
            // Mark emails with their matched company
            const markedEmails = companyEmails.map(email => ({
              ...email,
              matched_company: company
            }));
            allEmails.push(...markedEmails);
          }
        });
      }
      
      // Add tool-originated emails (avoiding duplicates)
      if (data.tool_originated_emails && Array.isArray(data.tool_originated_emails)) {
        const toolEmails = data.tool_originated_emails.filter(toolEmail =>
          !allEmails.some(existingEmail => existingEmail.id === toolEmail.id)
        );
        allEmails.push(...toolEmails);
      }
      
      // Sort emails by date (newest first)
      allEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setEmails(allEmails);
      
      if (onEmailsLoaded) {
        onEmailsLoaded(allEmails);
      }

      console.log(`📧 Enhanced filtering results:`, {
        totalEmails: allEmails.length,
        companyMatchedEmails: data.metrics?.company_matched_emails || 0,
        toolOriginatedEmails: data.metrics?.tool_originated_emails || 0,
        targetCompanies: targetCompanies
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emails from target companies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchEmails = async () => {
    // Load emails with enhanced filtering
    await handleLoadEmails();
    
    if (searchQuery.trim()) {
      // Enhanced search that includes tool-originated metadata and company information
      const filteredEmails = emails.filter(email => {
        const searchTerm = searchQuery.toLowerCase();
        
        // Basic search fields
        const basicMatch =
          email.subject.toLowerCase().includes(searchTerm) ||
          email.sender.toLowerCase().includes(searchTerm) ||
          email.snippet.toLowerCase().includes(searchTerm);
        
        // Enhanced search fields
        const enhancedMatch =
          email.matched_company?.toLowerCase().includes(searchTerm) ||
          email.tool_metadata?.original_request?.toLowerCase().includes(searchTerm) ||
          (email.is_tool_originated && ('tool'.includes(searchTerm) || 'ai'.includes(searchTerm) || 'automated'.includes(searchTerm)));
        
        return basicMatch || enhancedMatch;
      });
      setEmails(filteredEmails);
    }
  };

  const handleSendEmail = async () => {
    if (!connectionState?.isConnected) {
      setError('Gmail not connected');
      return;
    }

    if (!sendForm.to || !sendForm.subject || !sendForm.body) {
      setError('Please fill in all required fields (To, Subject, Body)');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/v1/gmail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        },
        body: JSON.stringify({
          to: sendForm.to,
          subject: sendForm.subject,
          body: sendForm.body,
          body_type: sendForm.bodyType,
          cc: sendForm.cc || undefined,
          bcc: sendForm.bcc || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        // Clear form on success
        setSendForm({
          to: '',
          subject: '',
          body: '',
          bodyType: 'text',
          cc: '',
          bcc: ''
        });
        setActiveTab('emails'); // Switch to emails tab
        // Refresh emails to show the sent email
        await handleLoadEmails();
      } else {
        throw new Error(data.message || 'Failed to send email');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsSending(false);
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
            <Mail className="w-6 h-6 text-red-600" />
            <span>Connect Your Gmail Account</span>
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
              onClick={handleDisconnectGmail}
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

        {!connectionState?.isConnected ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Required Permissions</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Read your emails</li>
                <li>• Send emails on your behalf</li>
                <li>• Access basic account information</li>
              </ul>
            </div>
            <Button 
              onClick={handleGmailConnect}
              disabled={isConnecting}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting to Gmail...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Connect Gmail Account
                </>
              )}
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="emails">Emails</TabsTrigger>
              <TabsTrigger value="send">Send Email</TabsTrigger>
            </TabsList>
            
            <TabsContent value="status" className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Connection Status</h4>
                <div className="text-sm text-green-800 space-y-1">
                  <p>✅ Gmail account connected successfully</p>
                  <p>📧 Email: {connectionState.emailAddress}</p>
                  <p>🔐 Permissions: {connectionState.scopes.length} scopes granted</p>
                  <p>⏰ Connected: {formatDate(connectionState.lastConnected)}</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => setActiveTab('emails')}
                  className="flex-1"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  View Emails
                </Button>
                <Button
                  onClick={() => setActiveTab('send')}
                  variant="outline"
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="emails" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  📧 Showing emails only from your target companies. Update your target companies in Settings to change which emails are displayed.
                </p>
              </div>
              
              <div className="flex space-x-2">
                <Input
                  placeholder="Search target company emails (subject, sender, content)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchEmails()}
                  className="flex-1"
                />
                <Button onClick={handleSearchEmails} disabled={isLoading}>
                  <Search className="w-4 h-4" />
                </Button>
                <Button onClick={() => handleLoadEmails()} disabled={isLoading} variant="outline">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Loading emails...
                </div>
              ) : emails.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      className={`border rounded-lg p-3 ${
                        email.is_read ? 'bg-gray-50' : 'bg-white border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1 flex-wrap">
                            <h4 className={`text-sm font-medium truncate ${
                              !email.is_read ? 'font-bold' : ''
                            }`}>
                              {email.subject || '(No Subject)'}
                            </h4>
                            
                            {/* Tool-originated badge */}
                            <ToolOriginatedBadgeComponent
                              isToolOriginated={email.is_tool_originated}
                              toolMetadata={email.tool_metadata}
                              size="sm"
                            />
                            
                            {/* Company badge */}
                            {email.matched_company && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                <Building2 className="w-3 h-3 mr-1" />
                                {email.matched_company}
                              </Badge>
                            )}
                            
                            {email.is_important && (
                              <Badge variant="secondary" className="text-xs">Important</Badge>
                            )}
                            {email.has_attachments && (
                              <Badge variant="outline" className="text-xs">📎</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 truncate">
                            From: {email.sender}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {email.snippet}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatDate(email.date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No emails found</p>
                  <Button
                    onClick={() => handleLoadEmails()}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Load Recent Emails
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="send" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">To *</label>
                  <Input
                    placeholder="recipient@example.com"
                    value={sendForm.to}
                    onChange={(e) => setSendForm(prev => ({ ...prev, to: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">CC</label>
                    <Input
                      placeholder="cc@example.com"
                      value={sendForm.cc}
                      onChange={(e) => setSendForm(prev => ({ ...prev, cc: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">BCC</label>
                    <Input
                      placeholder="bcc@example.com"
                      value={sendForm.bcc}
                      onChange={(e) => setSendForm(prev => ({ ...prev, bcc: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Subject *</label>
                  <Input
                    placeholder="Email subject"
                    value={sendForm.subject}
                    onChange={(e) => setSendForm(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Message *</label>
                    <Select
                      value={sendForm.bodyType}
                      onValueChange={(value: 'text' | 'html') => 
                        setSendForm(prev => ({ ...prev, bodyType: value }))
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    placeholder={sendForm.bodyType === 'html' 
                      ? '<p>Your HTML message here...</p>' 
                      : 'Your message here...'
                    }
                    value={sendForm.body}
                    onChange={(e) => setSendForm(prev => ({ ...prev, body: e.target.value }))}
                    rows={8}
                  />
                </div>
                
                <Button
                  onClick={handleSendEmail}
                  disabled={isSending || !sendForm.to || !sendForm.subject || !sendForm.body}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Email...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Email
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

export default GmailIntegration;