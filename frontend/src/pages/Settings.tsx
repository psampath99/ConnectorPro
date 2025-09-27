import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LinkedInIntegration } from '@/components/integrations/LinkedInIntegration';
import { CSVImport } from '@/components/integrations/CSVImport';
import { FileUploadHistory } from '@/components/integrations/FileUploadHistory';
import { GmailIntegration } from '@/components/integrations/GmailIntegration';
import { CalendarIntegration } from '@/components/integrations/CalendarIntegration';
import { storage } from '@/lib/storage';
import { User } from '@/types';
import {
  Settings as SettingsIcon,
  Building2,
  Target,
  User as UserIcon,
  CheckCircle,
  Plus,
  X,
  Save,
  RotateCcw,
  Lightbulb,
  Link,
  Info,
  Edit3,
  Mail,
  Calendar,
  GripVertical,
  ChevronUp,
  ChevronDown,
  FileText
} from 'lucide-react';

const commonCompanies = [
  'Google', 'Meta', 'Apple', 'Microsoft', 'Amazon', 'Netflix', 'Tesla', 'Stripe', 
  'Airbnb', 'Uber', 'LinkedIn', 'Salesforce', 'Adobe', 'Zoom', 'Slack', 'Figma',
  'Notion', 'Spotify', 'Twitter', 'TikTok', 'Snapchat', 'Pinterest', 'Dropbox', 'Square'
];

const roleLabels = {
  job_seeker: 'Job Seeker',
  consultant: 'Solo Consultant',
  community_manager: 'Community Manager',
  sales_rep: 'Sales Representative'
};

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [customCompany, setCustomCompany] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalTargetCompanies, setOriginalTargetCompanies] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [contactStats, setContactStats] = useState({
    totalActiveContacts: 0,
    latestUpload: null
  });
  const [gmailStatus, setGmailStatus] = useState<{
    status: string;
    email_address?: string;
    last_connected?: string;
    error_message?: string;
  } | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<{
    status: string;
    email_address?: string;
    last_connected?: string;
    error_message?: string;
  } | null>(null);

  // Fetch target companies from backend API (similar to Network page)
  const fetchTargetCompanies = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/target-companies', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.companies) {
          const companyNames = data.companies.map((tc: any) => tc.company_name);
          setTargetCompanies(companyNames);
          setOriginalTargetCompanies(companyNames);
          console.log('Loaded target companies from API:', companyNames);
          return companyNames;
        }
      }
    } catch (err) {
      console.error('Error fetching target companies from API:', err);
    }
    
    // Fallback to localStorage
    const companies = localStorage.getItem('connectorpro_target_companies');
    if (companies) {
      try {
        const parsedCompanies = JSON.parse(companies);
        setTargetCompanies(parsedCompanies);
        setOriginalTargetCompanies(parsedCompanies);
        console.log('Loaded target companies from localStorage:', parsedCompanies);
        return parsedCompanies;
      } catch (error) {
        console.error('Error parsing target companies:', error);
        setTargetCompanies([]);
        setOriginalTargetCompanies([]);
      }
    }
    return [];
  };

  useEffect(() => {
    const userData = storage.getUser();
    setUser(userData);

    // Load target companies from API first, then fallback to localStorage
    fetchTargetCompanies();

    // Load contact stats and integration statuses
    fetchContactStats();
    fetchGmailStatus();
    fetchCalendarStatus();
  }, []);

  // Fetch contact stats from backend
  const fetchContactStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/contacts/stats');
      if (response.ok) {
        const stats = await response.json();
        setContactStats(stats);
      }
    } catch (error) {
      console.error('Error fetching contact stats:', error);
    }
  };

  // Fetch Gmail status from backend
  const fetchGmailStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/gmail/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        }
      });
      if (response.ok) {
        const status = await response.json();
        setGmailStatus(status);
      }
    } catch (error) {
      console.error('Error fetching Gmail status:', error);
    }
  };

  // Fetch Calendar status from backend
  const fetchCalendarStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/calendar/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        }
      });
      if (response.ok) {
        const status = await response.json();
        setCalendarStatus(status);
      }
    } catch (error) {
      console.error('Error fetching Calendar status:', error);
    }
  };

  // Refresh contact stats and Gmail status when refresh trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchContactStats();
      fetchGmailStatus();
      fetchCalendarStatus();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    // Check if target companies have changed
    const companiesChanged = JSON.stringify(targetCompanies.sort()) !== JSON.stringify(originalTargetCompanies.sort());
    setHasChanges(companiesChanged);
  }, [targetCompanies, originalTargetCompanies]);

  const handleCompanyToggle = (company: string) => {
    setTargetCompanies(prev => 
      prev.includes(company)
        ? prev.filter(c => c !== company)
        : [...prev, company]
    );
  };

  const handleAddCustomCompany = () => {
    if (customCompany.trim() && !targetCompanies.includes(customCompany.trim())) {
      setTargetCompanies(prev => [...prev, customCompany.trim()]);
      setCustomCompany('');
    }
  };

  const handleRemoveCompany = (company: string) => {
    setTargetCompanies(prev => prev.filter(c => c !== company));
  };

  const handleSaveChanges = async () => {
    console.log('🔍 DEBUG - handleSaveChanges called with companies:', targetCompanies);
    
    try {
      // Save to backend API using bulk endpoint
      const response = await fetch('http://localhost:8000/api/v1/target-companies/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        },
        body: JSON.stringify(
          targetCompanies.map(company => ({
            company_name: company,
            company_domains: [] // Default empty domains, can be enhanced later
          }))
        )
      });

      console.log('🔍 DEBUG - API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 DEBUG - API response data:', data);
        
        if (data.success) {
          // Also save to localStorage as backup
          localStorage.setItem('connectorpro_target_companies', JSON.stringify(targetCompanies));
          setOriginalTargetCompanies([...targetCompanies]);
          setHasChanges(false);
          console.log('✅ Successfully saved target companies to backend and localStorage');
        } else {
          console.error('❌ Backend API returned success=false:', data);
          throw new Error(data.message || 'Failed to save target companies');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Backend API error:', response.status, errorText);
        throw new Error(`API error: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error saving target companies to backend:', error);
      
      // Fallback to localStorage only
      console.log('🔄 Falling back to localStorage only');
      localStorage.setItem('connectorpro_target_companies', JSON.stringify(targetCompanies));
      setOriginalTargetCompanies([...targetCompanies]);
      setHasChanges(false);
      
      // Show user a warning that backend save failed
      alert('Warning: Changes saved locally but failed to sync with server. Please try again or contact support if the issue persists.');
    }
  };

  const handleResetChanges = () => {
    setTargetCompanies([...originalTargetCompanies]);
    setHasChanges(false);
  };

  const updateUserPreferences = (updates: Partial<User['preferences']>) => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      preferences: {
        ...user.preferences,
        ...updates
      }
    };
    
    setUser(updatedUser);
    storage.setUser(updatedUser);
  };

  // Function to handle commonality order changes
  const moveCommonalityItem = (fromIndex: number, toIndex: number) => {
    if (!user) return;
    
    const newOrder = [...user.preferences.commonalityOrder];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);
    
    updateUserPreferences({ commonalityOrder: newOrder });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedItem !== null && draggedItem !== dropIndex) {
      moveCommonalityItem(draggedItem, dropIndex);
    }
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Function to trigger refresh of upload history and integration status
  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchContactStats(); // Also refresh contact stats
  };

  return (
    <div className="flex h-screen bg-gray-200">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-700">Manage your account preferences and networking settings</p>
            </div>

            {/* Profile and Account Information */}
            {user && (
              <Card>
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2" style={{ marginBottom: '1px' }}>
                      <UserIcon className="w-5 h-5" />
                      <span>Profile and Account Information</span>
                    </CardTitle>
                    <div className="group relative">
                      <Button
                        size="sm"
                        onClick={() => {
                          // Clear onboarding completion flag to trigger onboarding flow
                          localStorage.removeItem('connectorpro_onboarding_complete');
                          
                          // Redirect to home page which will show onboarding
                          window.location.href = '/';
                        }}
                        className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-1"
                      >
                        <Edit3 className="w-4 h-4" />
                        <Info className="w-3 h-3" />
                      </Button>
                      <div className="absolute right-0 top-10 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                        This will take you through the setup process again while preserving your existing data
                        <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
                </CardHeader>
                <CardContent>
                  {/* Profile Information Box */}
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">
                          First Name
                        </label>
                        <Input
                          value={user.name.split(' ')[0] || ''}
                          disabled
                          className="bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">
                          Last Name
                        </label>
                        <Input
                          value={user.name.split(' ').slice(1).join(' ') || ''}
                          disabled
                          className="bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">
                          Email Address
                        </label>
                        <Input value={user.email} disabled className="bg-white text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">
                          LinkedIn Profile
                        </label>
                        <Input
                          value={storage.getOnboardingData().linkedinProfileUrl || 'Not provided'}
                          disabled
                          className="bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">
                          Role
                        </label>
                        <Input value={roleLabels[user.role]} disabled className="bg-white text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">
                          Message Tone
                        </label>
                        <Input value={user.preferences.draftTone} disabled className="bg-white text-sm" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Target Companies Management */}
            <Card>
              <CardHeader className="relative">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2" style={{ marginBottom: '1px' }}>
                    <Target className="w-5 h-5" />
                    <span>Target Companies</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="group relative">
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center cursor-help hover:bg-blue-700 transition-colors duration-200">
                        <Info className="w-3 h-3 text-white" />
                      </div>
                      <div className="absolute right-0 top-6 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                        <h4 className="font-medium text-white mb-1">Why Target Companies?</h4>
                        <p>Target companies help organize your networking efforts. Messages, contacts, meetings, and tasks are grouped by these companies across the app, making it easier to track your progress with specific organizations.</p>
                        <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                    {hasChanges && (
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" onClick={handleResetChanges}>
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Reset
                        </Button>
                        <Button size="sm" onClick={handleSaveChanges}>
                          <Save className="w-4 h-4 mr-1" />
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </div>
                </CardTitle>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Current Target Companies */}
                {targetCompanies.length > 0 && (
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {targetCompanies.map((company) => (
                        <Badge
                          key={company}
                          variant="default"
                          className="flex items-center space-x-1 pr-1"
                        >
                          <Building2 className="w-3 h-3" />
                          <span>{company}</span>
                          <button
                            onClick={() => handleRemoveCompany(company)}
                            className="ml-1 hover:bg-blue-700 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add from Popular Companies */}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-3">
                    Add Popular Companies
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {commonCompanies
                      .filter(company => !targetCompanies.includes(company))
                      .map((company) => (
                        <Badge
                          key={company}
                          variant="outline"
                          className="cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                          onClick={() => handleCompanyToggle(company)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {company}
                        </Badge>
                      ))}
                  </div>
                </div>

                {/* Add Custom Company */}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    Add Custom Company
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter company name"
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddCustomCompany();
                        }
                      }}
                    />
                    <Button onClick={handleAddCustomCompany} disabled={!customCompany.trim()}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Networking Preferences */}
            {user && (
              <Card>
                <CardHeader className="relative">
                  <CardTitle className="flex items-center space-x-2" style={{ marginBottom: '1px' }}>
                    <SettingsIcon className="w-5 h-5" />
                    <span>Networking Preferences</span>
                  </CardTitle>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Message Tone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-2">
                        Default Message Tone
                      </label>
                      <Select 
                        value={user.preferences.draftTone} 
                        onValueChange={(value: any) => updateUserPreferences({ draftTone: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional - Formal and business-focused</SelectItem>
                          <SelectItem value="friendly">Friendly - Warm and approachable</SelectItem>
                          <SelectItem value="concise">Concise - Brief and to the point</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Reminder Frequency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-2">
                        Follow-up Reminder Frequency
                      </label>
                      <Select 
                        value={user.preferences.reminderFrequency.toString()} 
                        onValueChange={(value) => updateUserPreferences({ reminderFrequency: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">Every 3 days</SelectItem>
                          <SelectItem value="7">Every week</SelectItem>
                          <SelectItem value="14">Every 2 weeks</SelectItem>
                          <SelectItem value="30">Every month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Commonality Priority Order */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">
                      Commonality Priority Order
                    </label>
                    <p className="text-sm text-gray-600 mb-3">
                      This determines how AI prioritizes shared connections when suggesting introductions. Drag to reorder.
                    </p>
                    <div className="space-y-2">
                      {user.preferences.commonalityOrder.map((commonality, index) => (
                        <div
                          key={commonality}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-md cursor-move transition-all duration-200 ${
                            draggedItem === index
                              ? 'bg-blue-100 border border-blue-300 shadow-md'
                              : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                          }`}
                        >
                          <GripVertical className="w-3 h-3 text-gray-400" />
                          <span className="text-xs font-medium text-gray-700 w-5">#{index + 1}</span>
                          <Building2 className="w-3 h-3 text-gray-600" />
                          <span className="text-xs text-gray-800 flex-1">
                            {commonality === 'employer' && 'Shared Employer'}
                            {commonality === 'education' && 'Same School/University'}
                            {commonality === 'mutual' && 'Mutual Connections'}
                            {commonality === 'event' && 'Same Events/Communities'}
                          </span>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => index > 0 && moveCommonalityItem(index, index - 1)}
                              disabled={index === 0}
                              className={`p-0.5 rounded ${
                                index === 0
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => index < user.preferences.commonalityOrder.length - 1 && moveCommonalityItem(index, index + 1)}
                              disabled={index === user.preferences.commonalityOrder.length - 1}
                              className={`p-0.5 rounded ${
                                index === user.preferences.commonalityOrder.length - 1
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}


            {/* Data Import Options */}
            <Card>
              <CardHeader className="relative">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2" style={{ marginBottom: '1px' }}>
                    <Link className="w-5 h-5" />
                    <span>Import Your Network</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // This will be handled by the FileUploadHistory component
                        const event = new CustomEvent('toggleUploadHistory');
                        window.dispatchEvent(event);
                      }}
                      className="text-gray-600 hover:text-gray-800 text-xs"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Upload History
                    </Button>
                    <div className="group relative">
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center cursor-help hover:bg-blue-700 transition-colors duration-200">
                        <Info className="w-3 h-3 text-white" />
                      </div>
                      <div className="absolute right-0 top-6 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                        <h4 className="font-medium text-white mb-1">Import Your LinkedIn Network</h4>
                        <p>Choose between direct LinkedIn API integration (requires LinkedIn Company Page) or file upload (works with any LinkedIn account). Upload CSV, Numbers, or Excel files to import your connections and help you organize your networking efforts.</p>
                        <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                  </div>
                </CardTitle>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Import Options - Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* LinkedIn API Integration */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Option 1: LinkedIn API Integration</h3>
                    <LinkedInIntegration
                      onContactsImported={(contacts) => {
                        console.log('Contacts imported via API:', contacts);
                        // You could update the UI or show a success message here
                      }}
                    />
                  </div>

                  {/* CSV Import Alternative */}
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <h3 className="text-lg font-medium text-gray-900">Option 2: CSV Upload (Recommended)</h3>
                      <div className="group relative">
                        <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center cursor-help hover:bg-blue-700 transition-colors duration-200">
                          <Info className="w-2.5 h-2.5 text-white" />
                        </div>
                        <div className="absolute left-0 top-6 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                          <h4 className="font-medium text-white mb-2">How to get your LinkedIn CSV</h4>
                          <ol className="space-y-1 text-xs">
                            <li>1. Go to LinkedIn → Settings & Privacy → Data Privacy</li>
                            <li>2. Click "Get a copy of your data"</li>
                            <li>3. Select "Connections" and request your data</li>
                            <li>4. Download the CSV file when ready (usually within 24 hours)</li>
                            <li>5. Upload the CSV file below</li>
                          </ol>
                          <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      </div>
                    </div>
                    <CSVImport
                      onContactsImported={(contacts) => {
                        console.log('Contacts imported via CSV:', contacts);
                        // Trigger refresh of upload history and integration status
                        handleUploadComplete();
                      }}
                    />
                  </div>
                </div>

                {/* File Upload History */}
                <div>
                  <FileUploadHistory
                    refreshTrigger={refreshTrigger} // Pass refresh trigger to component
                    onFileClick={(upload) => {
                      // Handle file click - could open a modal with details or navigate to contacts
                      console.log('File clicked:', upload);
                      alert(`File: ${upload.fileName}\nUploaded: ${new Date(upload.uploadedAt).toLocaleString()}\nContacts: ${upload.contactsImported}/${upload.totalRows}\nStatus: ${upload.status}`);
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Gmail Integration */}
            <Card>
              <CardHeader className="relative">
                <CardTitle className="flex items-center space-x-2" style={{ marginBottom: '1px' }}>
                  <Mail className="w-5 h-5" />
                  <span>Gmail Integration</span>
                </CardTitle>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-2">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Connect Your Gmail Account</h4>
                      <p className="text-sm text-blue-800">
                        Connect Gmail to send personalized introduction requests and follow-up emails directly from ConnectorPro.
                        Your emails will be sent from your own Gmail account with full tracking and organization.
                      </p>
                    </div>
                  </div>
                </div>

                <GmailIntegration
                  onConnectionChange={() => {
                    // Refresh Gmail status when connection changes
                    fetchGmailStatus();
                  }}
                />
              </CardContent>
            </Card>

            {/* Google Calendar Integration */}
            <Card>
              <CardHeader className="relative">
                <CardTitle className="flex items-center space-x-2" style={{ marginBottom: '1px' }}>
                  <Calendar className="w-5 h-5" />
                  <span>Google Calendar Integration</span>
                </CardTitle>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-2">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Connect Your Google Calendar</h4>
                      <p className="text-sm text-blue-800">
                        Connect Google Calendar to schedule meetings, create events, and manage your calendar directly from ConnectorPro.
                        Perfect for scheduling networking meetings and follow-ups.
                      </p>
                    </div>
                  </div>
                </div>

                <CalendarIntegration
                  onConnectionChange={() => {
                    // Refresh Calendar status when connection changes
                    fetchCalendarStatus();
                  }}
                />
              </CardContent>
            </Card>

            {/* Connected Integrations */}
            <Card>
              <CardHeader className="relative">
                <CardTitle className="flex items-center space-x-2" style={{ marginBottom: '1px' }}>
                  <CheckCircle className="w-5 h-5" />
                  <span>Integration Status</span>
                </CardTitle>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
              </CardHeader>
              <CardContent>
               <div className="space-y-4" key={refreshTrigger}>
                 {/* LinkedIn Integration */}
                 <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">LinkedIn</h3>
                        <p className="text-sm text-gray-800">Network analysis and contact import</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Last imported: {(() => {
                            // Check new file upload history first (most recent method)
                            const fileUploadHistory = storage.getFileUploadHistory();
                            if (fileUploadHistory && fileUploadHistory.length > 0) {
                              // Get the most recent successful upload (regardless of contacts imported count)
                              const latestUpload = fileUploadHistory
                                .filter(upload => upload.status === 'success')
                                .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
                              
                              if (latestUpload) {
                                return new Date(latestUpload.uploadedAt).toLocaleString();
                              }
                            }
                            
                            // Fallback to old methods for backward compatibility
                            const csvUploadState = storage.getCsvUploadState();
                            const onboardingData = storage.getOnboardingData();
                            
                            if (csvUploadState && csvUploadState.csvUploadTimestamp) {
                              return new Date(csvUploadState.csvUploadTimestamp).toLocaleString();
                            } else if (onboardingData && onboardingData.csvUploadTimestamp) {
                              return new Date(onboardingData.csvUploadTimestamp).toLocaleString();
                            } else {
                              const uploadedFiles = storage.getUploadedFiles();
                              if (uploadedFiles && uploadedFiles.length > 0) {
                                const latestFile = uploadedFiles.sort((a, b) =>
                                  new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
                                )[0];
                                return new Date(latestFile.uploadedAt).toLocaleString();
                              }
                              return 'Never';
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-100 text-green-800 mb-1">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Connected
                      </Badge>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>Total active contacts: {contactStats.totalActiveContacts}</p>
                        {(() => {
                          // Get the most recent successful upload for new contacts info
                          const fileUploadHistory = storage.getFileUploadHistory();
                          
                          if (fileUploadHistory && fileUploadHistory.length > 0) {
                            const latestUpload = fileUploadHistory
                              .filter(upload => upload.status === 'success')
                              .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
                            
                            if (latestUpload) {
                              const imported = latestUpload.contactsImported || 0;
                              if (imported > 0) {
                                return <p>Last upload: {imported} new contacts added</p>;
                              } else {
                                return <p>Last upload: 0 new contacts (all duplicates)</p>;
                              }
                            }
                          }
                          
                          return <p>No recent uploads</p>;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Gmail Integration */}
                  <div className={`flex items-center justify-between p-4 rounded-lg border ${
                    gmailStatus?.status === 'connected'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        gmailStatus?.status === 'connected'
                          ? 'bg-red-600'
                          : 'bg-gray-400'
                      }`}>
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Gmail</h3>
                        <p className="text-sm text-gray-800">Send introduction requests and follow-ups</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {gmailStatus?.status === 'connected' && gmailStatus.email_address
                            ? `Connected: ${gmailStatus.email_address}`
                            : gmailStatus?.status === 'connected' && gmailStatus.last_connected
                            ? `Last connected: ${new Date(gmailStatus.last_connected).toLocaleString()}`
                            : 'Last connected: Never'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        gmailStatus?.status === 'connected'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }>
                        {gmailStatus?.status === 'connected' ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Connected
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3 mr-1" />
                            Not Connected
                          </>
                        )}
                      </Badge>
                      {gmailStatus?.error_message && (
                        <p className="text-xs text-red-600 mt-1">{gmailStatus.error_message}</p>
                      )}
                    </div>
                  </div>

                  {/* Google Calendar Integration */}
                  <div className={`flex items-center justify-between p-4 rounded-lg border ${
                    calendarStatus?.status === 'connected'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        calendarStatus?.status === 'connected'
                          ? 'bg-blue-600'
                          : 'bg-gray-400'
                      }`}>
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Google Calendar</h3>
                        <p className="text-sm text-gray-800">Schedule meetings and manage events</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {calendarStatus?.status === 'connected' && calendarStatus.email_address
                            ? `Connected: ${calendarStatus.email_address}`
                            : calendarStatus?.status === 'connected' && calendarStatus.last_connected
                            ? `Last connected: ${new Date(calendarStatus.last_connected).toLocaleString()}`
                            : 'Last connected: Never'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        calendarStatus?.status === 'connected'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }>
                        {calendarStatus?.status === 'connected' ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Connected
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3 mr-1" />
                            Not Connected
                          </>
                        )}
                      </Badge>
                      {calendarStatus?.error_message && (
                        <p className="text-xs text-red-600 mt-1">{calendarStatus.error_message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;