import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TargetCompaniesModal } from '@/components/modals/TargetCompaniesModal';
import { storage } from '@/lib/storage';
import { User, Contact, Recommendation, Draft, Task, Meeting, Activity } from '@/types';
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  CheckSquare, 
  TrendingUp,
  Building2,
  Mail,
  Clock,
  Target,
  ArrowRight,
  Plus,
  Send,
  Archive,
  AlertCircle,
  CheckCircle,
  Activity as ActivityIcon,
  Lightbulb,
  Star,
  Network,
  Zap,
  UserPlus,
  CalendarPlus,
  CalendarCheck,
  Edit3,
  ExternalLink,
  Reply,
  Settings,
  Circle,
  Check
} from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState<string>('7'); // Changed default to 7 days
  const [showTargetModal, setShowTargetModal] = useState(false);

  useEffect(() => {
    setUser(storage.getUser());
    setContacts(storage.getContacts());
    setRecommendations(storage.getRecommendations());
    setDrafts(storage.getDrafts());
    setTasks(storage.getTasks());
    setMeetings(storage.getMeetings());
    setActivities(storage.getActivities());
    
    // Fetch latest contacts from API for real-time updates
    fetchContactsFromAPI();
    loadTargetCompanies();
  }, []);

  const fetchContactsFromAPI = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/contacts?limit=1000', {
        headers: {
          'Authorization': `Bearer ${storage.getAccessToken() || 'demo-token'}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.contacts && data.contacts.length > 0) {
          setContacts(data.contacts);
          // Update localStorage with latest data
          storage.setContacts(data.contacts);
        }
      }
    } catch (error) {
      console.log('API fetch failed, using localStorage data:', error);
    }
  };

  const loadTargetCompanies = () => {
    const companies = localStorage.getItem('connectorpro_target_companies');
    if (companies) {
      try {
        setTargetCompanies(JSON.parse(companies));
      } catch (error) {
        console.error('Error parsing target companies:', error);
        setTargetCompanies(['Meta', 'Stripe', 'Airbnb']);
      }
    } else {
      setTargetCompanies(['Meta', 'Stripe', 'Airbnb']);
    }
  };

  const handleTargetCompaniesUpdate = () => {
    loadTargetCompanies();
  };

  // Get company logo URL with multiple fallback options
  const getCompanyLogo = (company: string) => {
    const logoMap: { [key: string]: string } = {
      'Meta': 'https://logo.clearbit.com/meta.com',
      'Stripe': 'https://logo.clearbit.com/stripe.com',
      'Airbnb': 'https://logo.clearbit.com/airbnb.com',
      'Google': 'https://logo.clearbit.com/google.com',
      'Microsoft': 'https://logo.clearbit.com/microsoft.com',
      'Apple': 'https://logo.clearbit.com/apple.com',
      'Amazon': 'https://logo.clearbit.com/amazon.com',
      'Netflix': 'https://logo.clearbit.com/netflix.com',
      'Tesla': 'https://logo.clearbit.com/tesla.com',
      'Uber': 'https://logo.clearbit.com/uber.com',
      'Spotify': 'https://logo.clearbit.com/spotify.com',
      'Twitter': 'https://logo.clearbit.com/x.com',
      'LinkedIn': 'https://logo.clearbit.com/linkedin.com',
      'Salesforce': 'https://logo.clearbit.com/salesforce.com',
      'Adobe': 'https://logo.clearbit.com/adobe.com'
    };
    
    return logoMap[company] || `https://logo.clearbit.com/${company.toLowerCase().replace(/\s+/g, '')}.com`;
  };

  // Filter data by timeframe
  const getTimeframeCutoff = () => {
    const now = new Date();
    const days = parseInt(timeframe);
    return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  };

  // Get timeframe end date (for upcoming items)
  const getTimeframeEndDate = () => {
    const now = new Date();
    const days = parseInt(timeframe);
    return new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  };

  // Get upcoming meetings based on timeframe - expanded to show more meetings
  const getUpcomingMeetings = () => {
    const now = new Date();
    const endDate = getTimeframeEndDate();
    
    // If no real meetings exist, create mock meetings for display
    const realMeetings = meetings.filter(m => {
      const meetingDate = new Date(m.startTime);
      return meetingDate >= now && meetingDate <= endDate && m.status === 'scheduled';
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // If we have real meetings, return them, otherwise create mock meetings
    if (realMeetings.length > 0) {
      return realMeetings.slice(0, 5);
    }

    // Create mock meetings for demonstration with persona-related topics for job seekers
    const mockMeetings = [
      {
        id: 'mock-1',
        title: 'Initial Introduction Meeting',
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        duration: 30,
        attendees: ['mock-attendee-1'],
        status: 'scheduled' as const,
        meetLink: 'https://meet.google.com/abc-defg-hij',
        agenda: 'Initial introduction and background discussion',
        attendeeNames: ['Sarah Chen (Meta)']
      },
      {
        id: 'mock-2',
        title: 'Follow-up Discussion',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        duration: 45,
        attendees: ['mock-attendee-2'],
        status: 'scheduled' as const,
        meetLink: 'https://zoom.us/j/123456789',
        agenda: 'Follow-up on previous conversation and next steps',
        attendeeNames: ['Mike Rodriguez (Stripe)']
      },
      {
        id: 'mock-3',
        title: 'Informational Interview',
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        duration: 30,
        attendees: ['mock-attendee-3'],
        status: 'scheduled' as const,
        meetLink: 'https://teams.microsoft.com/l/meetup-join/xyz',
        agenda: 'Learn about career opportunities and company culture',
        attendeeNames: ['David Kim (Microsoft)']
      },
      {
        id: 'mock-4',
        title: 'Coffee Chat',
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        duration: 30,
        attendees: ['mock-attendee-4'],
        status: 'scheduled' as const,
        meetLink: 'https://meet.google.com/xyz-abc-def',
        agenda: 'Casual networking conversation over virtual coffee',
        attendeeNames: ['Lisa Wang (Airbnb)']
      },
      {
        id: 'mock-5',
        title: 'Industry Insights Discussion',
        startTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        duration: 45,
        attendees: ['mock-attendee-5'],
        status: 'scheduled' as const,
        meetLink: 'https://zoom.us/j/987654321',
        agenda: 'Discuss industry trends and potential opportunities',
        attendeeNames: ['James Park (Google)']
      }
    ];

    // Sort by date and return
    return mockMeetings.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const upcomingMeetings = getUpcomingMeetings();

  // Calculate activity summary statistics with consistent mock data
  const getActivitySummary = () => {
    const days = parseInt(timeframe);
    
    // Generate realistic mock data based on timeframe - using consistent base values
    const getMockData = (baseValue: number, multiplier: number) => {
      const timeMultiplier = days === 7 ? 1 : days === 30 ? 4.3 : 12.9; // More realistic scaling
      return Math.floor(baseValue * multiplier * timeMultiplier);
    };

    // Mock data that scales with timeframe - consistent across all sections
    const newConnections = getMockData(2, 1); // 2, 9, 26 for 7/30/90 days
    const targetCompaniesWithNewConnections = Math.min(newConnections, targetCompanies.length);
    
    const newMeetings = upcomingMeetings.length; // Use actual upcoming meetings count
    const targetCompaniesWithNewMeetings = Math.min(newMeetings, targetCompanies.length);
    
    const messagesSent = getMockData(4, 1.25); // 5, 22, 65 for 7/30/90 days
    const targetCompaniesWithMessages = Math.min(Math.ceil(messagesSent / 2), targetCompanies.length);
    
    // Response rate simulation (30-40% range)
    const responseRate = 35 + (days % 8); // Varies between 35-42%
    const responsesReceived = Math.floor(messagesSent * (responseRate / 100));
    const targetCompaniesWithResponses = Math.min(responsesReceived, targetCompaniesWithMessages);
    
    return {
      newConnections,
      targetCompaniesWithNewConnections,
      newMeetings,
      targetCompaniesWithNewMeetings,
      messagesSent,
      targetCompaniesWithMessages,
      responsesReceived,
      targetCompaniesWithResponses,
      responseRate
    };
  };

  const activitySummary = getActivitySummary();

  // Calculate stats using consistent mock data
  const stats = {
    totalContacts: contacts.length,
    targetCompanyContacts: contacts.filter(c => targetCompanies.includes(c.company)).length,
    pendingTasks: tasks.filter(t => t.status === 'pending').length,
    upcomingMeetings: upcomingMeetings.length, // Use consistent count
    draftMessages: drafts.filter(d => d.status === 'draft').length,
    sentMessages: drafts.filter(d => d.status === 'sent').length
  };

  // Get target company progress data with timeframe filtering - using consistent mock data
  const getTargetCompanyProgress = (company: string) => {
    const cutoffDate = getTimeframeCutoff();
    const days = parseInt(timeframe);
    
    const companyContacts = contacts.filter(c => c.company === company);
    
    // Use consistent mock data per company
    const companyIndex = targetCompanies.indexOf(company);
    const baseSeed = companyIndex + 1;
    
    // New contacts within timeframe - consistent with activity summary
    const newContacts = Math.floor(activitySummary.newConnections / targetCompanies.length) + (companyIndex % 2);
    
    // Pending tasks for this company - consistent scaling
    const pendingTasks = Math.floor((days === 7 ? 2 : days === 30 ? 5 : 12) / targetCompanies.length) + (companyIndex % 3);
    
    // Completed meetings within timeframe - consistent with activity summary
    const completedMeetings = Math.floor(activitySummary.newMeetings / targetCompanies.length) + (companyIndex % 2);
    
    // Upcoming meetings - distribute upcoming meetings across companies
    const upcomingMeetingsCount = Math.floor(upcomingMeetings.length / targetCompanies.length) + (companyIndex % 2);

    return {
      totalContacts: companyContacts.length,
      newContacts: newContacts,
      pendingTasks: pendingTasks,
      completedMeetings: completedMeetings,
      upcomingMeetings: upcomingMeetingsCount
    };
  };

  // Get recent activities based on timeframe
  const getRecentActivities = () => {
    const cutoffDate = getTimeframeCutoff();
    
    return activities
      .filter(activity => new Date(activity.timestamp) >= cutoffDate)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  };

  const recentActivities = getRecentActivities();

  // Get priority recommendations based on timeframe
  const getPriorityRecommendations = () => {
    const cutoffDate = getTimeframeCutoff();
    
    return recommendations
      .filter(r => r.confidence > 0.8 && new Date(r.createdAt) >= cutoffDate)
      .slice(0, 3);
  };

  const priorityRecommendations = getPriorityRecommendations();

  // Enhanced recommendations data that matches contact recommendations
  const getEnhancedRecommendations = () => {
    // First try to get real recommendations from storage
    const storedRecommendations = storage.getRecommendations();
    if (storedRecommendations && storedRecommendations.length > 0) {
      return storedRecommendations
        .filter(r => r.confidence > 0.8)
        .slice(0, 3)
        .map(rec => ({
          ...rec,
          contact: contacts.find(c => c.id === rec.contactId)
        }));
    }

    // Enhanced fake recommendations that match the Contacts page structure
    return [
      {
        id: 'rec-1',
        contactId: 'contact-1',
        confidence: 0.95,
        createdAt: new Date(),
        connectionType: 'bridge' as const,
        commonConnection: 'Alex Thompson',
        reason: 'Strong mutual connection and shared background in product marketing',
        contact: {
          id: 'contact-1',
          name: 'Sarah Chen',
          company: 'Meta',
          title: 'Senior Product Marketing Manager',
          email: 'sarah.chen@meta.com',
          phone: '+1 (555) 123-4567',
          addedAt: new Date(),
          lastContact: new Date(),
          tags: ['product', 'marketing', 'target-company'],
          notes: 'Recommended through Alex Thompson - shared background in product marketing'
        }
      },
      {
        id: 'rec-2',
        contactId: 'contact-2',
        confidence: 0.88,
        createdAt: new Date(),
        connectionType: 'bridge' as const,
        commonConnection: 'Jennifer Park',
        reason: 'Former colleague connection with expertise in fintech',
        contact: {
          id: 'contact-2',
          name: 'Mike Rodriguez',
          company: 'Stripe',
          title: 'VP Product Marketing',
          email: 'mike.rodriguez@stripe.com',
          phone: '+1 (555) 234-5678',
          addedAt: new Date(),
          lastContact: new Date(),
          tags: ['fintech', 'payments', 'target-company'],
          notes: 'Recommended through Jennifer Park - former colleague with fintech expertise'
        }
      },
      {
        id: 'rec-3',
        contactId: 'contact-3',
        confidence: 0.82,
        createdAt: new Date(),
        connectionType: 'direct' as const,
        reason: 'Direct LinkedIn connection with relevant enterprise experience',
        contact: {
          id: 'contact-3',
          name: 'David Kim',
          company: 'Microsoft',
          title: 'Principal PM Manager',
          email: 'david.kim@microsoft.com',
          phone: '+1 (555) 345-6789',
          addedAt: new Date(),
          lastContact: new Date(),
          tags: ['enterprise', 'cloud', 'target-company'],
          notes: 'Direct LinkedIn connection with relevant enterprise PM experience'
        }
      }
    ];
  };

  // Get specific individual tasks with bullet points
  const getSpecificTasks = () => {
    return [
      {
        id: 'task-1',
        text: 'Schedule follow-up meeting with Sarah Chen at Meta',
        completed: false,
        priority: 'high'
      },
      {
        id: 'task-2',
        text: 'Send LinkedIn message to Mike Rodriguez at Stripe',
        completed: true,
        priority: 'medium'
      },
      {
        id: 'task-3',
        text: 'Prepare for informational interview with David Kim at Microsoft',
        completed: false,
        priority: 'high'
      },
      {
        id: 'task-4',
        text: 'Research company culture at Airbnb for Lisa Wang meeting',
        completed: false,
        priority: 'medium'
      },
      {
        id: 'task-5',
        text: 'Follow up on introduction request with Alex Thompson',
        completed: true,
        priority: 'low'
      },
      {
        id: 'task-6',
        text: 'Schedule coffee chat with Jennifer Park at Google',
        completed: false,
        priority: 'medium'
      },
      {
        id: 'task-7',
        text: 'Send thank you note to Kevin Park after Netflix meeting',
        completed: false,
        priority: 'high'
      }
    ];
  };

  const specificTasks = getSpecificTasks();
  const pendingTasks = specificTasks.filter(task => !task.completed);
  const completedTasks = specificTasks.filter(task => task.completed);

  // Get upcoming tasks based on timeframe
  const getUpcomingTasks = () => {
    const now = new Date();
    const endDate = getTimeframeEndDate();
    
    return tasks
      .filter(t => t.status === 'pending' && new Date(t.dueDate) >= now && new Date(t.dueDate) <= endDate)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 3);
  };

  const upcomingTasks = getUpcomingTasks();

  // Get upcoming meetings summary with consistent mock data
  const getUpcomingMeetingsSummary = () => {
    return {
      scheduledMeetings: upcomingMeetings.length, // Use actual upcoming meetings count
      targetCompanyMeetings: Math.min(upcomingMeetings.length, targetCompanies.length * 2),
      preparationNeeded: Math.floor(upcomingMeetings.length * 0.6) // 60% need prep
    };
  };

  const meetingsSummary = getUpcomingMeetingsSummary();

  // Get target company tag for a contact
  const getTargetCompanyTag = (contact: Contact | undefined) => {
    if (!contact) return 'Other';
    
    const contactCompany = contact.company;
    const matchingTargetCompanies = targetCompanies.filter(tc => tc === contactCompany);
    
    if (matchingTargetCompanies.length > 1) {
      return 'Multiple';
    } else if (matchingTargetCompanies.length === 1) {
      return matchingTargetCompanies[0];
    } else {
      return 'Other';
    }
  };

  // Get connection description
  const getConnectionDescription = (rec: any) => {
    if (rec.connectionType === 'direct') {
      return '1st degree connection';
    } else if (rec.connectionType === 'bridge' && rec.commonConnection) {
      return `Bridge connection w/ ${rec.commonConnection}`;
    } else {
      return 'High-value connection opportunity';
    }
  };

  // Handle crafting message for recommendation
  const handleCraftMessage = (recommendation: any) => {
    const contact = recommendation.contact;
    if (!contact) return;

    // Store the recommendation context for message crafting
    const messageContext = {
      contactId: contact.id,
      contactName: contact.name,
      contactCompany: contact.company,
      contactTitle: contact.title,
      connectionType: recommendation.connectionType,
      commonConnection: recommendation.commonConnection,
      confidence: recommendation.confidence,
      reason: recommendation.reason || getConnectionDescription(recommendation),
      isTargetCompany: targetCompanies.includes(contact.company),
      recommendationId: recommendation.id
    };

    // Store in localStorage for the message composer to use
    localStorage.setItem('connectorpro_message_context', JSON.stringify(messageContext));

    // Navigate to messages page with compose mode
    navigate('/messages?compose=true&from=recommendation');
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'contact_added': return Users;
      case 'message_sent': return Send;
      case 'meeting_scheduled': return Calendar;
      case 'task_completed': return CheckCircle;
      case 'recommendation_viewed': return Star;
      default: return ActivityIcon;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'contact_added': return 'text-blue-600';
      case 'message_sent': return 'text-green-600';
      case 'meeting_scheduled': return 'text-purple-600';
      case 'task_completed': return 'text-emerald-600';
      case 'recommendation_viewed': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const formatActivityTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const formatMeetingDate = (startTime: Date) => {
    const meetingDate = new Date(startTime);
    return meetingDate.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit'
    });
  };

  // Parse attendee name and company from "Name (Company)" format
  const parseAttendee = (attendeeName: string) => {
    const match = attendeeName.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
      return {
        name: match[1].trim(),
        company: match[2].trim()
      };
    }
    return {
      name: attendeeName,
      company: ''
    };
  };

  // Use enhanced recommendations that match contact recommendations
  const displayRecommendations = (() => {
    const recs = getEnhancedRecommendations();

    // Sort by target companies first, then others
    return recs.sort((a, b) => {
      const aIsTarget = targetCompanies.includes(a.contact?.company || '');
      const bIsTarget = targetCompanies.includes(b.contact?.company || '');
      
      if (aIsTarget && !bIsTarget) return -1;
      if (!aIsTarget && bIsTarget) return 1;
      return 0; // Keep original order within each group
    });
  })();

  // Calculate target company specific metrics
  const getTargetCompanyMetrics = () => {
    const targetCompanyContacts = contacts.filter(c => targetCompanies.includes(c.company));
    const targetCompanyNewContacts = Math.floor(activitySummary.newConnections * 0.7); // 70% from target companies
    const targetCompanyMessagesSent = Math.floor(activitySummary.messagesSent * 0.8); // 80% to target companies
    const targetCompanyResponseRate = Math.min(activitySummary.responseRate + 5, 100); // 5% higher response rate for target companies
    const targetCompanyMeetingsCompleted = Math.floor(activitySummary.newMeetings * 0.6); // 60% with target companies

    return {
      totalContacts: targetCompanyContacts.length,
      newContacts: targetCompanyNewContacts,
      messagesSent: targetCompanyMessagesSent,
      responseRate: targetCompanyResponseRate,
      meetingsCompleted: targetCompanyMeetingsCompleted
    };
  };

  const targetCompanyMetrics = getTargetCompanyMetrics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-gray-600">Your network at a glance — today's highlights</p>
        </div>
        <div className="flex flex-col items-end space-y-3">
          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="flex items-center space-x-3 py-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Add Contact</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center space-x-3 py-3">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <span>New Message</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center space-x-3 py-3">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <span>Schedule Meeting</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center space-x-3 py-3">
                  <CheckSquare className="w-5 h-5 text-orange-600" />
                  <span>Create Task</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TargetCompaniesModal 
              onUpdate={handleTargetCompaniesUpdate}
              trigger={
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Edit Targets</span>
                </Button>
              }
            />
          </div>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics - Tabular Top Row (Now First) */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-center py-4 px-6 font-medium text-gray-600">
                    <div className="flex items-center justify-center space-x-2">
                      <span>Target Companies</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-6 font-medium text-gray-600">
                    <div className="flex items-center justify-center space-x-2">
                      <Users className="w-5 h-5 text-green-600" />
                      <span>Total Contacts</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-6 font-medium text-gray-600">
                    <div className="flex items-center justify-center space-x-2">
                      <CheckSquare className="w-5 h-5 text-orange-600" />
                      <span>Pending Tasks</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-6 font-medium text-gray-600">
                    <div className="flex items-center justify-center space-x-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <span>Upcoming Meetings</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="text-center py-6 px-6">
                    <p className="text-3xl font-bold text-blue-600">{targetCompanies.length}</p>
                  </td>
                  <td className="text-center py-6 px-6">
                    <p className="text-3xl font-bold text-green-600">{stats.totalContacts}</p>
                  </td>
                  <td className="text-center py-6 px-6">
                    <p className="text-3xl font-bold text-orange-600">{pendingTasks.length}</p>
                  </td>
                  <td className="text-center py-6 px-6">
                    <p className="text-3xl font-bold text-purple-600">{meetingsSummary.scheduledMeetings}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Target Company Progress - Now Below Key Metrics */}
      {targetCompanies.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Target className="w-6 h-6 text-blue-600" />
              <CardTitle>Target Company Progress</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-1/3" />
                  <col className="w-1/6" />
                  <col className="w-1/6" />
                  <col className="w-1/6" />
                  <col className="w-1/6" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 font-medium text-gray-900">Company Name</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">
                      <div className="flex items-center space-x-2">
                        <UserPlus className="w-4 h-4 text-blue-600" />
                        <span>New Contacts</span>
                      </div>
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">
                      <div className="flex items-center space-x-2">
                        <CheckSquare className="w-4 h-4 text-orange-600" />
                        <span>Pending Tasks</span>
                      </div>
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">
                      <div className="flex items-center space-x-2">
                        <CalendarCheck className="w-4 h-4 text-green-600" />
                        <span>Meetings Completed</span>
                      </div>
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span>Upcoming Meetings</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {targetCompanies.map((company, index) => {
                    const progress = getTargetCompanyProgress(company);
                    return (
                      <tr 
                        key={company} 
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-3">
                            <div className="relative w-8 h-8">
                              <img 
                                src={getCompanyLogo(company)} 
                                alt={`${company} logo`}
                                className="w-8 h-8 rounded-md object-contain bg-white border border-gray-200"
                                onLoad={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  const fallback = target.nextElementSibling as HTMLDivElement;
                                  if (fallback) fallback.style.display = 'none';
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLDivElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center text-blue-600 font-semibold text-sm">
                                {company.charAt(0)}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Contacts: {progress.totalContacts}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                            <span className="text-sm font-bold text-blue-900">{progress.newContacts}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full">
                            <span className="text-sm font-bold text-orange-900">{progress.pendingTasks}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                            <span className="text-sm font-bold text-green-900">{progress.completedMeetings}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="inline-flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
                            <span className="text-sm font-bold text-purple-900">{progress.upcomingMeetings}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-orange-500" />
              <span>Priority Recommendations</span>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                {displayRecommendations.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayRecommendations.map((rec) => {
                const contact = rec.contact;
                const targetTag = getTargetCompanyTag(contact);
                const isTargetCompany = targetCompanies.includes(contact?.company || '');
                
                return (
                  <div key={rec.id} className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">{contact?.name}</p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            isTargetCompany 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          {isTargetCompany && <Target className="w-3 h-3 mr-1" />}
                          {targetTag}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{contact?.company} • {contact?.title}</p>
                      <p className="text-xs text-gray-700 mt-1">{getConnectionDescription(rec)}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-orange-600 border-orange-200 hover:bg-orange-50"
                      onClick={() => handleCraftMessage(rec)}
                      title="Craft message based on connection type"
                    >
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Meetings Summary - Now Above Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              <span>Upcoming Meetings Summary</span>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                {upcomingMeetings.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Attendee</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Company</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingMeetings.map((meeting, index) => {
                    const attendee = parseAttendee(meeting.attendeeNames?.[0] || '');
                    const isTargetCompany = targetCompanies.includes(attendee.company);
                    
                    return (
                      <Fragment key={meeting.id}>
                        <tr className={`border-b border-gray-100 hover:bg-purple-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}>
                          <td className="py-3 px-4">
                            {meeting.meetLink ? (
                              <a 
                                href={meeting.meetLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-purple-600 hover:text-purple-800 hover:underline cursor-pointer"
                              >
                                {formatMeetingDate(meeting.startTime)}
                              </a>
                            ) : (
                              <span className="text-sm font-medium text-gray-900">
                                {formatMeetingDate(meeting.startTime)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-700">
                              {new Date(meeting.startTime).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-gray-900">
                              {attendee.name}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-700">{attendee.company}</span>
                              {isTargetCompany && (
                                <Target className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                          </td>
                        </tr>
                        {meeting.agenda && (
                          <tr className={`border-b border-gray-100 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}>
                            <td colSpan={4} className="py-2 px-4">
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">Topic:</span> {meeting.agenda}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks Summary - Now with Individual Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span>Upcoming Tasks</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {pendingTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {specificTasks.map((task) => (
                <div key={task.id} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {task.completed ? (
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Circle className="w-3 h-3 text-yellow-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}>
                      {task.text}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          task.priority === 'high' 
                            ? 'bg-red-50 text-red-700 border-red-200' 
                            : task.priority === 'medium'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {task.priority} priority
                      </Badge>
                    </div>
                  </div>
                  {!task.completed && (
                    <Button size="sm" variant="outline" className="text-yellow-600 border-yellow-200">
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}