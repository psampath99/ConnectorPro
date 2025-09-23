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
  Link
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

  useEffect(() => {
    const userData = storage.getUser();
    setUser(userData);

    // Load target companies
    const companies = localStorage.getItem('connectorpro_target_companies');
    if (companies) {
      try {
        const parsedCompanies = JSON.parse(companies);
        setTargetCompanies(parsedCompanies);
        setOriginalTargetCompanies(parsedCompanies);
      } catch (error) {
        console.error('Error parsing target companies:', error);
        setTargetCompanies([]);
        setOriginalTargetCompanies([]);
      }
    }
  }, []);

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

  const handleSaveChanges = () => {
    localStorage.setItem('connectorpro_target_companies', JSON.stringify(targetCompanies));
    setOriginalTargetCompanies([...targetCompanies]);
    setHasChanges(false);
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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage your account preferences and networking settings</p>
            </div>

            {/* User Profile */}
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserIcon className="w-5 h-5" />
                    <span>Profile Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <Input value={user.name} disabled className="bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <Input value={user.email} disabled className="bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <Input value={roleLabels[user.role]} disabled className="bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Member Since
                      </label>
                      <Input value={new Date(user.createdAt).toLocaleDateString()} disabled className="bg-gray-50" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Target Companies Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>Target Companies</span>
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
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Why Target Companies?</h4>
                      <p className="text-sm text-blue-800">
                        Target companies help organize your networking efforts. Messages, contacts, meetings, and tasks 
                        are grouped by these companies across the app, making it easier to track your progress with 
                        specific organizations.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Target Companies */}
                {targetCompanies.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Current Target Companies ({targetCompanies.length})
                    </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-3">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <SettingsIcon className="w-5 h-5" />
                    <span>Networking Preferences</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Message Tone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commonality Priority Order
                    </label>
                    <p className="text-sm text-gray-500 mb-3">
                      This determines how AI prioritizes shared connections when suggesting introductions
                    </p>
                    <div className="space-y-2">
                      {user.preferences.commonalityOrder.map((commonality, index) => (
                        <div key={commonality} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-600 w-6">#{index + 1}</span>
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700 flex-1 capitalize">
                            {commonality === 'employer' && 'Shared Employer'}
                            {commonality === 'education' && 'Same School/University'}
                            {commonality === 'mutual' && 'Mutual Connections'}
                            {commonality === 'event' && 'Same Events/Communities'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Data Import Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Link className="w-5 h-5" />
                  <span>Import Your Network</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Import Your LinkedIn Network</h4>
                      <p className="text-sm text-blue-800">
                        Choose between direct LinkedIn API integration (requires LinkedIn Company Page) or
                        file upload (works with any LinkedIn account). Upload CSV, Numbers, or Excel files to import your connections
                        and help you organize your networking efforts.
                      </p>
                    </div>
                  </div>
                </div>

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
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Option 2: CSV Upload (Recommended)</h3>
                  <CSVImport
                    onContactsImported={(contacts) => {
                      console.log('Contacts imported via CSV:', contacts);
                      // You could update the UI or show a success message here
                    }}
                  />
                </div>

                {/* File Upload History */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Upload History</h3>
                  <FileUploadHistory
                    onFileClick={(upload) => {
                      // Handle file click - could open a modal with details or navigate to contacts
                      console.log('File clicked:', upload);
                      alert(`File: ${upload.fileName}\nUploaded: ${new Date(upload.uploadedAt).toLocaleString()}\nContacts: ${upload.contactsImported}/${upload.totalRows}\nStatus: ${upload.status}`);
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Connected Integrations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Integration Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* LinkedIn Integration */}
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">LinkedIn</h3>
                        <p className="text-sm text-gray-700">Network analysis and contact import</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Last imported: {(() => {
                            const csvUploadState = storage.getCsvUploadState();
                            const onboardingData = storage.getOnboardingData();
                            
                            if (csvUploadState && csvUploadState.uploadTimestamp) {
                              return new Date(csvUploadState.uploadTimestamp).toLocaleString();
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
                      <p className="text-xs text-gray-500">
                        {(() => {
                          const contacts = storage.getContacts();
                          const linkedinContacts = contacts.filter(c =>
                            c.tags && (c.tags.includes('linkedin-import') || c.tags.includes('csv-import'))
                          );
                          return `${linkedinContacts.length} contacts imported`;
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Gmail Integration */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Gmail</h3>
                        <p className="text-sm text-gray-700">Send introduction requests and follow-ups</p>
                        <p className="text-xs text-gray-500 mt-1">Last connected: Never</p>
                      </div>
                    </div>
                    <Badge className="bg-gray-100 text-gray-600">
                      <X className="w-3 h-3 mr-1" />
                      Not Connected
                    </Badge>
                  </div>

                  {/* Google Calendar Integration */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Google Calendar</h3>
                        <p className="text-sm text-gray-700">Schedule meetings with automatic video links</p>
                        <p className="text-xs text-gray-500 mt-1">Last connected: Never</p>
                      </div>
                    </div>
                    <Badge className="bg-gray-100 text-gray-600">
                      <X className="w-3 h-3 mr-1" />
                      Not Connected
                    </Badge>
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