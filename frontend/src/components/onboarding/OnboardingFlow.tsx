import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { User } from '@/types';
import { storage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import {
  Network,
  Users,
  Briefcase,
  Calendar,
  TrendingUp,
  UserCheck,
  Building2,
  Target,
  Settings,
  CheckCircle,
  Search,
  Handshake,
  Globe,
  Upload,
  Shield,
  Download,
  FileText,
  AlertCircle,
  Linkedin,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Mail,
  CalendarDays,
  Loader2
} from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  storageLocation?: string;
  contactsImported: number;
  totalContacts: number;
}

interface OnboardingData {
  persona: User['role'] | '';
  name: string;
  email: string;
  linkedinProfileUrl: string;
  primaryGoal: string;
  linkedinConnected: boolean;
  emailConnected: boolean;
  calendarConnected: boolean;
  csvUploaded: boolean;
  csvImportResult: any;
  uploadedFiles: UploadedFile[];
  targetCompanies: string[];
  draftTone: 'professional' | 'friendly' | 'concise';
  commonalityOrder: ('employer' | 'education' | 'mutual' | 'event')[];
}

interface OnboardingFlowProps {
  onComplete: (userData: User) => void;
}

const personas = [
  {
    id: 'job_seeker' as const,
    title: 'Job Seeker',
    description: 'Looking for new career opportunities and need to connect with insiders at target companies',
    icon: Briefcase,
    goals: ['Find warm introductions to hiring managers', 'Get referrals and insider insights', 'Schedule informational interviews']
  },
  {
    id: 'consultant' as const,
    title: 'Solo Consultant',
    description: 'Building a consulting practice and need to revive relationships for referrals',
    icon: TrendingUp,
    goals: ['Reconnect with past clients', 'Generate referrals and repeat business', 'Expand professional network']
  },
  {
    id: 'community_manager' as const,
    title: 'Community Manager',
    description: 'Managing events and communities, need to facilitate valuable connections',
    icon: Users,
    goals: ['Connect event attendees', 'Manage sponsor relationships', 'Build community engagement']
  },
  {
    id: 'sales_rep' as const,
    title: 'Sales Representative',
    description: 'Need warm introductions to prospects and decision-makers',
    icon: Target,
    goals: ['Get warm introductions to prospects', 'Leverage existing relationships', 'Increase deal win rates']
  }
];

const goalsByPersona = {
  job_seeker: [
    {
      id: 'research_referrals',
      title: 'Research Companies & Build Referral Network',
      description: 'Learn about target companies while building relationships for referrals',
      icon: Search,
      strategy: 'Casual outreach to employees at all levels'
    },
    {
      id: 'hiring_decision_makers',
      title: 'Connect with Hiring Decision-Makers',
      description: 'Get formal introductions to hiring managers and team leads',
      icon: Target,
      strategy: 'Credible bridge paths to decision-makers'
    },
    {
      id: 'expand_network',
      title: 'Expand Long-Term Professional Network',
      description: 'Build strategic relationships for future career opportunities',
      icon: Globe,
      strategy: 'Industry-wide networking across companies'
    }
  ],
  consultant: [
    {
      id: 'revive_relationships',
      title: 'Revive Past Client Relationships',
      description: 'Reconnect with former clients and colleagues for referrals',
      icon: Handshake,
      strategy: 'Warm follow-ups with existing connections'
    },
    {
      id: 'generate_referrals',
      title: 'Generate New Business Referrals',
      description: 'Build relationships that lead to consulting opportunities',
      icon: TrendingUp,
      strategy: 'Strategic networking for business development'
    },
    {
      id: 'expand_network',
      title: 'Expand Professional Network',
      description: 'Build long-term relationships in your industry',
      icon: Globe,
      strategy: 'Industry-focused relationship building'
    }
  ],
  community_manager: [
    {
      id: 'event_networking',
      title: 'Facilitate Event Networking',
      description: 'Connect attendees and create valuable introductions',
      icon: Users,
      strategy: 'Community-focused relationship facilitation'
    },
    {
      id: 'sponsor_relationships',
      title: 'Manage Sponsor Relationships',
      description: 'Build and maintain partnerships with event sponsors',
      icon: Handshake,
      strategy: 'Partnership-focused networking'
    },
    {
      id: 'community_growth',
      title: 'Grow Community Engagement',
      description: 'Expand community reach and member connections',
      icon: Globe,
      strategy: 'Growth-focused community building'
    }
  ],
  sales_rep: [
    {
      id: 'warm_introductions',
      title: 'Get Warm Introductions to Prospects',
      description: 'Leverage network for introductions to potential customers',
      icon: Target,
      strategy: 'Bridge paths to decision-makers'
    },
    {
      id: 'leverage_relationships',
      title: 'Leverage Existing Relationships',
      description: 'Turn current connections into sales opportunities',
      icon: Handshake,
      strategy: 'Relationship-to-revenue conversion'
    },
    {
      id: 'expand_network',
      title: 'Expand Sales Network',
      description: 'Build relationships for future sales opportunities',
      icon: Globe,
      strategy: 'Strategic sales networking'
    }
  ]
};

const commonCompanies = [
  'Google', 'Meta', 'Apple', 'Microsoft', 'Amazon', 'Netflix', 'Tesla', 'Stripe', 
  'Airbnb', 'Uber', 'LinkedIn', 'Salesforce', 'Adobe', 'Zoom', 'Slack', 'Figma',
  'Notion', 'Spotify', 'Twitter', 'TikTok', 'Snapchat', 'Pinterest', 'Dropbox', 'Square'
];

const commonalityItems = {
  employer: { label: 'Shared Employer', icon: Building2 },
  education: { label: 'Same School/University', icon: Settings },
  mutual: { label: 'Mutual Connections', icon: Users },
  event: { label: 'Same Events/Communities', icon: Calendar }
};

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    persona: '',
    name: '',
    email: '',
    linkedinProfileUrl: '',
    primaryGoal: '',
    linkedinConnected: false,
    emailConnected: false,
    calendarConnected: false,
    csvUploaded: false,
    csvImportResult: null,
    uploadedFiles: [],
    targetCompanies: [],
    draftTone: 'professional',
    commonalityOrder: ['employer', 'education', 'mutual', 'event']
  });

  // CSV upload state
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [selectedCSVFile, setSelectedCSVFile] = useState<File | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const totalSteps = 5;

  // Load persistent state and check real connection statuses on component mount
  useEffect(() => {
    console.log('🔍 Loading persistent onboarding state on mount...');
    
    const loadPersistentState = async () => {
      try {
        const onboardingData = storage.getOnboardingData();
        console.log('Onboarding data from storage:', onboardingData);
        
        if (onboardingData.csvUploaded && onboardingData.csvImportResult) {
          console.log('✅ Found persistent CSV upload state - restoring...');
          console.log('CSV Import Result:', onboardingData.csvImportResult);
          
          // Create uploaded file from stored data
          const uploadedFile: UploadedFile = {
            id: `file-${Date.now()}`,
            name: onboardingData.csvImportResult.fileName || 'LinkedIn contacts file',
            size: 0, // Size not stored in old format
            type: 'text/csv',
            uploadedAt: onboardingData.csvUploadTimestamp || new Date().toISOString(),
            contactsImported: onboardingData.csvImportResult.imported || onboardingData.csvImportResult.contactsImported || 0,
            totalContacts: onboardingData.csvImportResult.total || onboardingData.csvImportResult.contactsImported || 0,
            storageLocation: 'localStorage'
          };
          
          const existingFiles = storage.getUploadedFiles();
          
          setData(prev => ({
            ...prev,
            csvUploaded: true,
            csvImportResult: onboardingData.csvImportResult,
            uploadedFiles: existingFiles.length > 0 ? existingFiles : [uploadedFile],
            linkedinConnected: true,
            // Also restore other onboarding data if available
            primaryGoal: onboardingData.primaryGoal || prev.primaryGoal,
            targetCompanies: Array.isArray(onboardingData.targetCompanies) ? onboardingData.targetCompanies : prev.targetCompanies,
            linkedinProfileUrl: onboardingData.linkedinProfileUrl || prev.linkedinProfileUrl
          }));
          console.log('✅ Persistent state loaded successfully');
        } else {
          console.log('❌ No persistent CSV upload state found');
          console.log('csvUploaded:', onboardingData.csvUploaded);
          console.log('csvImportResult:', onboardingData.csvImportResult);
        }

        // Check real Gmail connection status
        try {
          const gmailStatusResponse = await fetch('http://localhost:8000/api/v1/gmail/status', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
            }
          });

          if (gmailStatusResponse.ok) {
            const gmailStatus = await gmailStatusResponse.json();
            setData(prev => ({
              ...prev,
              emailConnected: gmailStatus.status === 'connected'
            }));
            console.log('Gmail connection status:', gmailStatus.status);
          }
        } catch (error) {
          console.error('Error checking Gmail status:', error);
        }

        // Calendar connection is not implemented yet, so keep it false
        setData(prev => ({
          ...prev,
          calendarConnected: false
        }));

      } catch (error) {
        console.error('Error loading persistent state:', error);
        // Clear potentially corrupted data
        storage.clearCsvUploadState();
      }
    };

    loadPersistentState();
  }, []);

  // Detect email provider based on domain
  const getEmailProvider = (email: string) => {
    const domain = email.toLowerCase().split('@')[1];
    if (!domain) return 'other';
    
    if (domain === 'gmail.com') return 'gmail';
    if (domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com') return 'icloud';
    if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com') return 'outlook';
    if (domain === 'yahoo.com') return 'yahoo';
    
    return 'other';
  };

  const emailProvider = getEmailProvider(data.email);

  const handlePersonaSelect = (persona: User['role']) => {
    setData(prev => ({ ...prev, persona, primaryGoal: '' })); // Reset goal when persona changes
  };

  const handleGoalSelect = (goalId: string) => {
    setData(prev => ({ ...prev, primaryGoal: goalId }));
  };

  const handleLinkedInConnect = async () => {
    try {
      // Check LinkedIn RapidAPI status
      const response = await fetch('http://localhost:8000/api/v1/linkedin/rapidapi/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to connect to LinkedIn API service');
      }

      const data = await response.json();
      
      if (data.status === 'configured') {
        // RapidAPI is configured, mark as connected
        setData(prev => ({ ...prev, linkedinConnected: true }));
        
        toast({
          title: "LinkedIn Connected",
          description: "LinkedIn API service is configured and ready to use.",
          variant: "default",
        });
        
        console.log('LinkedIn API service connected successfully');
      } else {
        throw new Error(data.message || 'LinkedIn API service not properly configured');
      }
      
    } catch (err) {
      console.error('LinkedIn connection error:', err);
      toast({
        title: "LinkedIn Connection Error",
        description: err instanceof Error ? err.message : 'Failed to connect to LinkedIn',
        variant: "destructive",
      });
    }
  };

  // CSV Upload handlers
  const handleCSVFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setCsvError('File size must be less than 5MB');
        return;
      }
      setSelectedCSVFile(file);
      setCsvError(null);
    }
  };

  const handleCSVUpload = async () => {
    if (!selectedCSVFile) {
      setCsvError('Please select a CSV file first');
      toast({
        title: "Error",
        description: "Please select a file first",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingCSV(true);
    setCsvError(null);
    setUploadProgress(0);

    // Show loading toast
    const loadingToast = toast({
      title: "Uploading file...",
      description: `Processing ${selectedCSVFile.name}`,
    });

    try {
      const formData = new FormData();
      formData.append('file', selectedCSVFile);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('http://localhost:8000/api/v1/contacts/import/csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storage.getAccessToken()}`
        },
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Safe JSON parsing with fallback
      let result;
      try {
        result = await response.json();
      } catch {
        result = { success: false, message: "Server did not return JSON" };
      }

      console.log('CSV Upload Result:', result);

      if (result.success) {
        console.log("Uploaded:", result.fileName);
      } else {
        console.error("Upload failed:", result.message);
        throw new Error(result.message || 'Failed to import CSV');
      }

      // Create uploaded file metadata
      const uploadedFile: UploadedFile = {
        id: `file-${Date.now()}`,
        name: selectedCSVFile.name,
        size: selectedCSVFile.size,
        type: selectedCSVFile.type,
        uploadedAt: new Date().toISOString(),
        contactsImported: result.imported || result.contactsImported || 0,
        totalContacts: result.total || result.contactsImported || 0,
        storageLocation: result.storageLocation || 'localStorage'
      };
      
      setData(prev => ({
        ...prev,
        csvUploaded: true,
        csvImportResult: result,
        uploadedFiles: [...prev.uploadedFiles, uploadedFile],
        linkedinConnected: true // Mark LinkedIn as connected since we have the data
      }));

      // Store upload state persistently with filename using centralized storage
      storage.setCsvUploadState(result, selectedCSVFile.name);
      storage.addUploadedFile(uploadedFile);
      console.log('✅ CSV upload state saved to localStorage');

      // Save imported contacts to localStorage for dashboard display
      if (result.contacts && result.contacts.length > 0) {
        console.log('Processing contacts for localStorage:', result.contacts.length);
        
        const formattedContacts = result.contacts.map((contact: any) => ({
          id: contact._id,
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
          addedAt: new Date(contact.addedAt),
          linkedinData: contact.linkedinData || {}
        }));
        
        console.log('Formatted contacts:', formattedContacts);
        
        // Add to existing contacts in localStorage
        const existingContacts = storage.getContacts();
        console.log('Existing contacts in localStorage:', existingContacts.length);
        
        const allContacts = [...existingContacts, ...formattedContacts];
        storage.setContacts(allContacts);
        
        console.log(`✅ Saved ${formattedContacts.length} contacts to localStorage. Total contacts now: ${allContacts.length}`);
        
        // Verify the save worked
        const verifyContacts = storage.getContacts();
        console.log('Verification - contacts in localStorage after save:', verifyContacts.length);
      } else {
        console.warn('No contacts found in result:', result);
      }

      // Show success toast
      toast({
        title: "✅ File uploaded successfully!",
        description: `${uploadedFile.name} - ${uploadedFile.contactsImported} contacts imported`,
        variant: "default",
      });
      
      // Clear the file input
      setSelectedCSVFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import CSV file';
      setCsvError(errorMessage);
      
      // Show error toast
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploadingCSV(false);
      setUploadProgress(0);
    }
  };

  // File management functions
  const handleDeleteFile = (fileId: string) => {
    setData(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter(file => file.id !== fileId),
      csvUploaded: prev.uploadedFiles.length > 1,
      csvImportResult: prev.uploadedFiles.length > 1 ? prev.csvImportResult : null
    }));

    // Remove from storage
    storage.removeUploadedFile(fileId);

    // Clear storage if no files left
    if (data.uploadedFiles.length === 1) {
      storage.clearCsvUploadState();
    }

    toast({
      title: "File deleted",
      description: "File has been removed from your uploads",
    });
  };

  const handleViewFile = (file: UploadedFile) => {
    const contacts = storage.getContacts();
    if (contacts && contacts.length > 0) {
      const csvContent = contacts.map(contact =>
        `${contact.name || ''},${contact.email || ''},${contact.company || ''},${contact.title || ''}`
      ).join('\n');
      const blob = new Blob([`Name,Email,Company,Position\n${csvContent}`], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      toast({
        title: "No data found",
        description: "No contact data available for download",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['First Name', 'Last Name', 'Email Address', 'Company', 'Position', 'Connected On', 'Profile URL'],
      ['John', 'Doe', 'john.doe@example.com', 'Tech Corp', 'Software Engineer', '2023-01-15', 'https://linkedin.com/in/johndoe'],
      ['Jane', 'Smith', 'jane.smith@example.com', 'Design Studio', 'UX Designer', '2023-02-20', 'https://linkedin.com/in/janesmith'],
      ['Mike', 'Johnson', 'mike.johnson@example.com', 'Marketing Inc', 'Marketing Manager', '2023-03-10', 'https://linkedin.com/in/mikejohnson']
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linkedin_contacts_sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleEmailConnect = async () => {
    try {
      if (emailProvider === 'gmail') {
        // Check Gmail connection status first
        const statusResponse = await fetch('http://localhost:8000/api/v1/gmail/status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
          }
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.status === 'connected') {
            setData(prev => ({ ...prev, emailConnected: true }));
            console.log('Gmail already connected');
            return;
          }
        }

        // Get Gmail authorization URL
        const authResponse = await fetch('http://localhost:8000/api/v1/gmail/auth-url', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
          }
        });

        if (authResponse.ok) {
          const authData = await authResponse.json();
          if (authData.success && authData.auth_url) {
            // Open authorization URL in new window
            window.open(authData.auth_url, 'gmail-auth', 'width=500,height=600');
            // Note: In a real implementation, you'd handle the OAuth callback
            toast({
              title: "Gmail Authorization",
              description: "Please complete the authorization in the popup window. This is a demo - actual OAuth flow would be implemented.",
              variant: "default",
            });
          } else {
            throw new Error(authData.message || 'Failed to get authorization URL');
          }
        } else {
          throw new Error('Failed to get Gmail authorization URL');
        }
      } else {
        // For other email providers, show a message that they're not yet supported
        toast({
          title: "Email Integration",
          description: `${emailProvider} integration is not yet implemented. Gmail integration is available.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Email connection error:', error);
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : 'Failed to connect email',
        variant: "destructive",
      });
    }
  };

  const handleCalendarConnect = async () => {
    try {
      // For now, just show a message that calendar integration is not yet implemented
      toast({
        title: "Calendar Integration",
        description: "Calendar integration is coming soon. This feature will be available in a future update.",
        variant: "default",
      });
    } catch (error) {
      console.error('Calendar connection error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect calendar",
        variant: "destructive",
      });
    }
  };

  const handleCompanyToggle = (company: string) => {
    setData(prev => ({
      ...prev,
      targetCompanies: prev.targetCompanies.includes(company)
        ? prev.targetCompanies.filter(c => c !== company)
        : [...prev.targetCompanies, company]
    }));
  };

  const handleAddCustomCompany = (company: string) => {
    if (company.trim() && !data.targetCompanies.includes(company.trim())) {
      setData(prev => ({
        ...prev,
        targetCompanies: [...prev.targetCompanies, company.trim()]
      }));
    }
  };

  const moveCommonalityUp = (index: number) => {
    if (index > 0) {
      setData(prev => {
        const newOrder = [...prev.commonalityOrder];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        return { ...prev, commonalityOrder: newOrder };
      });
    }
  };

  const moveCommonalityDown = (index: number) => {
    if (index < data.commonalityOrder.length - 1) {
      setData(prev => {
        const newOrder = [...prev.commonalityOrder];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        return { ...prev, commonalityOrder: newOrder };
      });
    }
  };

  const handleComplete = () => {
    const user: User = {
      id: `user-${Date.now()}`,
      email: data.email,
      name: data.name,
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
    storage.setOnboardingData(data, emailProvider);
    console.log('✅ Onboarding data saved to localStorage');
    
    onComplete(user);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return data.persona !== '';
      case 2: return data.name.trim() !== '' && data.email.trim() !== '' && data.linkedinProfileUrl.trim() !== '' && data.primaryGoal !== '';
      case 3: return data.linkedinConnected || data.csvUploaded; // Allow either LinkedIn connection or CSV upload
      case 4: return data.targetCompanies.length > 0;
      case 5: return true;
      default: return false;
    }
  };

  const selectedPersona = personas.find(p => p.id === data.persona);
  const availableGoals = data.persona ? goalsByPersona[data.persona] : [];

  // Get provider-specific integration options
  const getEmailIntegrationOptions = () => {
    switch (emailProvider) {
      case 'gmail':
        return {
          primary: { name: 'Gmail', icon: Mail, color: 'red' },
          calendar: { name: 'Google Calendar', icon: CalendarDays, color: 'green' }
        };
      case 'icloud':
        return {
          primary: { name: 'iCloud Mail', icon: Mail, color: 'blue' },
          calendar: { name: 'iCloud Calendar', icon: CalendarDays, color: 'blue' },
          alternatives: [
            { name: 'Gmail', icon: Mail, color: 'red' },
            { name: 'Outlook', icon: Mail, color: 'blue' },
            { name: 'Yahoo Mail', icon: Mail, color: 'purple' }
          ]
        };
      case 'outlook':
        return {
          primary: { name: 'Outlook', icon: Mail, color: 'blue' },
          calendar: { name: 'Outlook Calendar', icon: CalendarDays, color: 'blue' },
          alternatives: [
            { name: 'Gmail', icon: Mail, color: 'red' },
            { name: 'iCloud Mail', icon: Mail, color: 'blue' },
            { name: 'Yahoo Mail', icon: Mail, color: 'purple' }
          ]
        };
      case 'yahoo':
        return {
          primary: { name: 'Yahoo Mail', icon: Mail, color: 'purple' },
          calendar: { name: 'Yahoo Calendar', icon: CalendarDays, color: 'purple' },
          alternatives: [
            { name: 'Gmail', icon: Mail, color: 'red' },
            { name: 'iCloud Mail', icon: Mail, color: 'blue' },
            { name: 'Outlook', icon: Mail, color: 'blue' }
          ]
        };
      default:
        return {
          primary: { name: 'Email', icon: Mail, color: 'gray' },
          calendar: { name: 'Calendar', icon: CalendarDays, color: 'gray' },
          alternatives: [
            { name: 'Gmail', icon: Mail, color: 'red' },
            { name: 'iCloud Mail', icon: Mail, color: 'blue' },
            { name: 'Outlook', icon: Mail, color: 'blue' },
            { name: 'Yahoo Mail', icon: Mail, color: 'purple' }
          ]
        };
    }
  };

  const integrationOptions = getEmailIntegrationOptions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Network className="w-7 h-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to ConnectorPro</CardTitle>
          <p className="text-gray-600">Let's set up your AI-powered networking assistant</p>
          
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

        <CardContent className="space-y-6">
          {/* Step 1: Persona Selection Only */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">What describes you best?</h3>
                <p className="text-gray-600">Choose the role that best matches your networking needs</p>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {personas.map((persona) => (
                  <div
                    key={persona.id}
                    onClick={() => handlePersonaSelect(persona.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      data.persona === persona.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <persona.icon className={`w-6 h-6 mt-1 ${
                        data.persona === persona.id ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{persona.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{persona.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Basic Info + Goal Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Tell us about yourself</h3>
                <p className="text-gray-600">Basic information and your primary networking goal</p>
              </div>

              {selectedPersona && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <selectedPersona.icon className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">{selectedPersona.title}</span>
                  </div>
                  <p className="text-sm text-blue-800 mt-1">{selectedPersona.description}</p>
                </div>
              )}

              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <Input
                    value={data.name}
                    onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={data.email}
                    onChange={(e) => setData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email address"
                  />
                  {data.email && emailProvider !== 'other' && (
                    <p className="text-xs text-gray-500 mt-1">
                      We'll suggest {integrationOptions.primary.name} integration in the next step
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn Profile URL
                  </label>
                  <Input
                    type="url"
                    value={data.linkedinProfileUrl}
                    onChange={(e) => setData(prev => ({ ...prev, linkedinProfileUrl: e.target.value }))}
                    placeholder="https://www.linkedin.com/in/your-profile"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We'll use this to help you download your LinkedIn connections CSV file
                  </p>
                </div>
              </div>

              {/* Goal Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What's your primary networking focus?
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    This helps us personalize your AI recommendations and message drafting
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {availableGoals.map((goal) => (
                    <div
                      key={goal.id}
                      onClick={() => handleGoalSelect(goal.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        data.primaryGoal === goal.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <goal.icon className={`w-5 h-5 mt-1 ${
                          data.primaryGoal === goal.id ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{goal.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                          <p className="text-xs text-gray-500 mt-2 italic">{goal.strategy}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Platform Integrations */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Connect your platforms</h3>
                <p className="text-gray-600">Integrate with your existing tools for seamless networking</p>
              </div>

              {/* LinkedIn Integration - Required */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Linkedin className="w-8 h-8" />
                      <div>
                        <h4 className="text-lg font-semibold">LinkedIn Network Import</h4>
                        <p className="text-blue-100 text-sm">Required - Choose your preferred method</p>
                      </div>
                    </div>
                    {(data.linkedinConnected || data.csvUploaded) && (
                      <CheckCircle className="w-6 h-6 text-green-300" />
                    )}
                  </div>
                  
                  {!data.linkedinConnected && !data.csvUploaded ? (
                    <>
                      <p className="text-blue-100 mb-4">
                        Import your LinkedIn network to analyze connections and find the best introduction paths
                      </p>
                      
                      {/* Option 1: LinkedIn API Connection */}
                      <div className="bg-white/10 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-white">Option 1: LinkedIn API (Quick)</h5>
                          <Button
                            onClick={handleLinkedInConnect}
                            size="sm"
                            className="bg-white text-blue-600 hover:bg-gray-100"
                          >
                            <Linkedin className="w-4 h-4 mr-2" />
                            Connect LinkedIn
                          </Button>
                        </div>
                        <p className="text-xs text-blue-100">
                          Instantly connect and import your network data through LinkedIn's API
                        </p>
                      </div>

                      {/* Option 2: CSV Upload */}
                      <div className="bg-white/10 rounded-lg p-4">
                        <h5 className="font-medium text-white mb-3">Option 2: Upload LinkedIn CSV/Numbers</h5>
                        
                        <div className="bg-white/20 rounded p-3 mb-4">
                          <p className="text-sm text-blue-100 mb-2">
                            <strong>📋 How to get your LinkedIn connections file:</strong>
                          </p>
                          <ol className="text-xs text-blue-100 space-y-1 list-decimal list-inside">
                            <li>Go to your LinkedIn profile: <span className="font-mono bg-white/20 px-1 rounded">{data.linkedinProfileUrl || 'your-profile-url'}</span></li>
                            <li>Click "Settings & Privacy" → "Data Privacy" → "Get a copy of your data"</li>
                            <li>Select "Connections" and download the CSV file</li>
                            <li>Upload the CSV or Numbers file below (both formats supported)</li>
                          </ol>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={downloadSampleCSV}
                            className="mt-2 text-blue-100 hover:bg-white/20"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download Sample Format
                          </Button>
                        </div>

                        {csvError && (
                          <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{csvError}</AlertDescription>
                          </Alert>
                        )}

                        <div className="border-2 border-dashed border-white/30 rounded-lg p-4 text-center mb-4">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.numbers,.xlsx,.xls,application/vnd.apple.numbers,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                            onChange={handleCSVFileSelect}
                            className="hidden"
                            id="csv-upload-onboarding"
                          />
                          <label htmlFor="csv-upload-onboarding" className="cursor-pointer">
                            <Upload className="w-8 h-8 text-blue-200 mx-auto mb-2" />
                            <p className="text-sm font-medium text-white mb-1">
                              {selectedCSVFile ? selectedCSVFile.name : 'Choose CSV or Numbers file'}
                            </p>
                            <p className="text-xs text-blue-100">
                              Click to browse or drag and drop your LinkedIn CSV or Numbers file
                            </p>
                            <p className="text-xs text-blue-200 mt-1">
                              Maximum file size: 5MB • Supports: CSV, Numbers, Excel
                            </p>
                          </label>
                        </div>

                        {selectedCSVFile && (
                          <div className="bg-white/20 rounded p-3 mb-4">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-blue-200" />
                              <span className="text-sm text-white">{selectedCSVFile.name}</span>
                              <span className="text-xs text-blue-100">
                                ({formatFileSize(selectedCSVFile.size)})
                              </span>
                            </div>
                          </div>
                        )}

                        {isUploadingCSV && uploadProgress > 0 && (
                          <div className="mb-4">
                            <div className="flex justify-between text-xs text-blue-100 mb-1">
                              <span>Uploading...</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <Progress value={uploadProgress} className="h-2 bg-white/20" />
                          </div>
                        )}

                        <Button
                          onClick={handleCSVUpload}
                          disabled={!selectedCSVFile || isUploadingCSV}
                          className="w-full bg-white text-blue-600 hover:bg-gray-100"
                        >
                          {isUploadingCSV ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Importing Contacts...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Import Contacts from File
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white/20 rounded p-3">
                      {(() => {
                        console.log('🔍 Visual indicator rendering check:');
                        console.log('data.csvUploaded:', data.csvUploaded);
                        console.log('data.csvImportResult:', data.csvImportResult);
                        console.log('Should show CSV result:', data.csvUploaded && data.csvImportResult);
                        return null;
                      })()}
                      
                      {data.uploadedFiles.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 mb-3">
                            <CheckCircle className="w-5 h-5 text-green-300" />
                            <p className="text-sm font-medium text-white">Files Successfully Uploaded!</p>
                          </div>
                          
                          {/* Uploaded Files List */}
                          <div className="space-y-2">
                            <p className="text-xs text-blue-100 font-medium">Uploaded Files:</p>
                            {data.uploadedFiles.map((file) => (
                              <div key={file.id} className="bg-white/10 rounded-lg p-3 border border-white/20">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <FileText className="w-4 h-4 text-blue-200" />
                                    <span className="text-sm text-white font-medium">{file.name}</span>
                                  </div>
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => handleViewFile(file)}
                                      className="px-2 py-1 text-xs bg-white/20 text-white rounded hover:bg-white/30 transition-colors border border-white/30"
                                      title="Download file"
                                    >
                                      📁 View
                                    </button>
                                    <button
                                      onClick={() => handleDeleteFile(file.id)}
                                      className="px-2 py-1 text-xs bg-red-500/20 text-red-200 rounded hover:bg-red-500/30 transition-colors border border-red-300/30"
                                      title="Delete file"
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                </div>
                                <div className="text-xs text-blue-100 space-y-1">
                                  <div className="flex justify-between">
                                    <span>Size: {formatFileSize(file.size)}</span>
                                    <span>Contacts: {file.contactsImported}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}</span>
                                    <span>Time: {new Date(file.uploadedAt).toLocaleTimeString()}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="bg-white/10 rounded p-2 mt-3">
                            <p className="text-xs text-blue-100">
                              💾 Total contacts imported: {data.uploadedFiles.reduce((sum, file) => sum + file.contactsImported, 0)}
                            </p>
                            <p className="text-xs text-blue-100">
                              📊 Data stored and ready for dashboard analysis
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm">✅ Successfully imported 247 connections from LinkedIn</p>
                          <p className="text-xs text-blue-100 mt-1">
                            Your LinkedIn network has been imported and is ready for analysis
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Email Integration - Based on provided email */}
                <div className="border-2 border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <integrationOptions.primary.icon className={`w-8 h-8 text-${integrationOptions.primary.color}-600`} />
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{integrationOptions.primary.name}</h4>
                        <p className="text-gray-600 text-sm">
                          {emailProvider === 'gmail' ? 'Recommended' : 'Suggested'} - Send introduction requests
                        </p>
                      </div>
                    </div>
                    {data.emailConnected && (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-4 text-sm">
                    Connect {integrationOptions.primary.name} to send introduction requests and follow-up emails directly from ConnectorPro
                  </p>
                  
                  {!data.emailConnected ? (
                    <div className="space-y-3">
                      <Button 
                        onClick={handleEmailConnect}
                        variant="outline"
                        className={`border-${integrationOptions.primary.color}-200 text-${integrationOptions.primary.color}-600 hover:bg-${integrationOptions.primary.color}-50`}
                      >
                        <integrationOptions.primary.icon className="w-4 h-4 mr-2" />
                        Connect {integrationOptions.primary.name}
                      </Button>
                      
                      {integrationOptions.alternatives && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Or choose another email provider:</p>
                          <div className="flex flex-wrap gap-2">
                            {integrationOptions.alternatives.map((alt) => (
                              <Button
                                key={alt.name}
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={handleEmailConnect}
                              >
                                <alt.icon className="w-3 h-3 mr-1" />
                                {alt.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <p className="text-sm text-green-800">✅ {integrationOptions.primary.name} connected - Ready to send emails</p>
                    </div>
                  )}
                </div>

                {/* Calendar Integration - Based on email provider */}
                <div className="border-2 border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <integrationOptions.calendar.icon className={`w-8 h-8 text-${integrationOptions.calendar.color}-600`} />
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{integrationOptions.calendar.name}</h4>
                        <p className="text-gray-600 text-sm">Optional - Schedule meetings automatically</p>
                      </div>
                    </div>
                    {data.calendarConnected && (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-4 text-sm">
                    Connect {integrationOptions.calendar.name} to automatically create meeting invites with video links
                  </p>
                  
                  {!data.calendarConnected ? (
                    <Button 
                      onClick={handleCalendarConnect}
                      variant="outline"
                      className={`border-${integrationOptions.calendar.color}-200 text-${integrationOptions.calendar.color}-600 hover:bg-${integrationOptions.calendar.color}-50`}
                    >
                      <integrationOptions.calendar.icon className="w-4 h-4 mr-2" />
                      Connect {integrationOptions.calendar.name}
                    </Button>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <p className="text-sm text-green-800">✅ {integrationOptions.calendar.name} connected - Ready to schedule meetings</p>
                    </div>
                  )}
                </div>

                {/* Integration Benefits */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 mb-2">Why connect these platforms?</h5>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span><strong>LinkedIn:</strong> Analyze your network and find introduction paths</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span><strong>{integrationOptions.primary.name}:</strong> Send personalized introduction requests seamlessly</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span><strong>{integrationOptions.calendar.name}:</strong> Schedule meetings with automatic video links</span>
                    </div>
                  </div>
                </div>

                {/* Privacy note */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Shield className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-gray-900 mb-1">Privacy & Security</h5>
                      <p className="text-sm text-gray-700">
                        Your data is stored securely and never shared. We only use it to provide networking recommendations and facilitate your outreach.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Target Companies */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Which companies interest you?</h3>
                <p className="text-gray-600">Select companies you'd like to connect with people at</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Popular Companies
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {commonCompanies.map((company) => (
                      <Badge
                        key={company}
                        variant={data.targetCompanies.includes(company) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-blue-100"
                        onClick={() => handleCompanyToggle(company)}
                      >
                        {company}
                        {data.targetCompanies.includes(company) && (
                          <CheckCircle className="w-3 h-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Custom Company
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter company name"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddCustomCompany((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        const input = (e.target as HTMLElement).parentElement?.querySelector('input');
                        if (input) {
                          handleAddCustomCompany(input.value);
                          input.value = '';
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {data.targetCompanies.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected Companies ({data.targetCompanies.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {data.targetCompanies.map((company) => (
                        <Badge
                          key={company}
                          variant="default"
                          className="cursor-pointer"
                          onClick={() => handleCompanyToggle(company)}
                        >
                          {company}
                          <span className="ml-1 text-xs">×</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Preferences */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Customize your preferences</h3>
                <p className="text-gray-600">These settings help personalize your networking approach</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Tone
                  </label>
                  <Select value={data.draftTone} onValueChange={(value: any) => setData(prev => ({ ...prev, draftTone: value }))}>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commonality Priority Order
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Drag to reorder how we prioritize shared connections when suggesting introductions
                  </p>
                  <div className="space-y-2">
                    {data.commonalityOrder.map((commonalityKey, index) => {
                      const item = commonalityItems[commonalityKey];
                      return (
                        <div key={commonalityKey} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                          <span className="text-sm font-medium text-gray-600 w-6">#{index + 1}</span>
                          <item.icon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveCommonalityUp(index)}
                              disabled={index === 0}
                              className="p-1 h-8 w-8"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveCommonalityDown(index)}
                              disabled={index === data.commonalityOrder.length - 1}
                              className="p-1 h-8 w-8"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Higher priority commonalities will be emphasized more in AI-generated messages
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">You're all set! 🎉</h4>
                  <p className="text-sm text-green-800">
                    ConnectorPro will help you find the best networking opportunities at your target companies 
                    and draft personalized messages that highlight your strongest commonalities.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
            >
              Back
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!canProceed()}
                className="bg-green-600 hover:bg-green-700"
              >
                Complete Setup
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}