import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { storage } from '@/lib/storage';
import { Contact, Task, Meeting, Activity } from '@/types';
import { 
  Users, 
  Send, 
  Calendar, 
  TrendingUp,
  Target,
  UserPlus,
  CalendarCheck,
  BarChart3,
  Network,
  Activity as ActivityIcon,
  MessageSquare,
  CheckCircle,
  Star,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function Feed() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState<string>('7');

  useEffect(() => {
    setContacts(storage.getContacts());
    setTasks(storage.getTasks());
    setMeetings(storage.getMeetings());
    setActivities(storage.getActivities());
    loadTargetCompanies();
  }, []);

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

  // Get timeframe end date (for upcoming items)
  const getTimeframeEndDate = () => {
    const now = new Date();
    const days = parseInt(timeframe);
    return new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  };

  // Get upcoming meetings based on timeframe
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

    // Create mock meetings for demonstration
    const mockMeetings = [
      {
        id: 'mock-1',
        title: 'Initial Introduction Meeting',
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
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
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
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
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
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
        startTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        duration: 45,
        attendees: ['mock-attendee-5'],
        status: 'scheduled' as const,
        meetLink: 'https://zoom.us/j/987654321',
        agenda: 'Discuss industry trends and potential opportunities',
        attendeeNames: ['James Park (Google)']
      }
    ];

    return mockMeetings.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const upcomingMeetings = getUpcomingMeetings();

  // Calculate activity summary statistics with consistent mock data
  const getActivitySummary = () => {
    const days = parseInt(timeframe);
    
    // Generate realistic mock data based on timeframe
    const getMockData = (baseValue: number, multiplier: number) => {
      const timeMultiplier = days === 7 ? 1 : days === 30 ? 4.3 : 12.9;
      return Math.floor(baseValue * multiplier * timeMultiplier);
    };

    const newConnections = getMockData(2, 1);
    const newMeetings = upcomingMeetings.length;
    const messagesSent = getMockData(4, 1.25);
    
    // Response rate simulation (30-40% range)
    const responseRate = 35 + (days % 8);
    const responsesReceived = Math.floor(messagesSent * (responseRate / 100));
    
    return {
      newConnections,
      newMeetings,
      messagesSent,
      responsesReceived,
      responseRate
    };
  };

  const activitySummary = getActivitySummary();

  // Calculate stats using consistent mock data
  const stats = {
    totalContacts: contacts.length,
    targetCompanyContacts: contacts.filter(c => targetCompanies.includes(c.company)).length,
  };

  // Calculate target company specific metrics
  const getTargetCompanyMetrics = () => {
    const targetCompanyContacts = contacts.filter(c => targetCompanies.includes(c.company));
    const targetCompanyNewContacts = Math.floor(activitySummary.newConnections * 0.7);
    const targetCompanyMessagesSent = Math.floor(activitySummary.messagesSent * 0.8);
    const targetCompanyResponseRate = Math.min(activitySummary.responseRate + 5, 100);
    const targetCompanyMeetingsCompleted = Math.floor(activitySummary.newMeetings * 0.6);

    return {
      totalContacts: targetCompanyContacts.length,
      newContacts: targetCompanyNewContacts,
      messagesSent: targetCompanyMessagesSent,
      responseRate: targetCompanyResponseRate,
      meetingsCompleted: targetCompanyMeetingsCompleted
    };
  };

  const targetCompanyMetrics = getTargetCompanyMetrics();

  // Enhanced mock recent activities with more realistic timestamps
  const getRecentActivities = () => {
    const now = new Date();
    const mockActivities = [
      // Today
      {
        id: 'activity-1',
        type: 'contact_added',
        description: 'Added new contact Sarah Chen from Meta',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        contactId: 'contact-1'
      },
      {
        id: 'activity-2',
        type: 'message_sent',
        description: 'Sent follow-up message to Mike Rodriguez at Stripe',
        timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
        contactId: 'contact-2'
      },
      {
        id: 'activity-3',
        type: 'meeting_scheduled',
        description: 'Scheduled informational interview with David Kim from Microsoft',
        timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
        contactId: 'contact-3'
      },
      // Yesterday
      {
        id: 'activity-4',
        type: 'task_completed',
        description: 'Completed research on Airbnb company culture',
        timestamp: new Date(now.getTime() - 20 * 60 * 60 * 1000), // 20 hours ago (yesterday)
        contactId: 'contact-4'
      },
      {
        id: 'activity-5',
        type: 'recommendation_viewed',
        description: 'Reviewed connection recommendation for Lisa Wang',
        timestamp: new Date(now.getTime() - 26 * 60 * 60 * 1000), // 26 hours ago (yesterday)
        contactId: 'contact-5'
      },
      {
        id: 'activity-6',
        type: 'message_sent',
        description: 'Sent introduction request to Alex Kumar for Sarah Chen',
        timestamp: new Date(now.getTime() - 30 * 60 * 60 * 1000), // 30 hours ago (yesterday)
        contactId: 'contact-6'
      },
      // 2 days ago
      {
        id: 'activity-7',
        type: 'contact_added',
        description: 'Added new contact Jennifer Liu from Stripe',
        timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 2 days ago
        contactId: 'contact-7'
      },
      {
        id: 'activity-8',
        type: 'meeting_scheduled',
        description: 'Scheduled coffee chat with Priya Patel from Airbnb',
        timestamp: new Date(now.getTime() - 50 * 60 * 60 * 1000), // 2 days ago
        contactId: 'contact-8'
      },
      // 3 days ago
      {
        id: 'activity-9',
        type: 'task_completed',
        description: 'Completed follow-up task for Kevin Park at Netflix',
        timestamp: new Date(now.getTime() - 72 * 60 * 60 * 1000), // 3 days ago
        contactId: 'contact-9'
      },
      {
        id: 'activity-10',
        type: 'message_sent',
        description: 'Sent LinkedIn message to Amanda Foster at Stripe',
        timestamp: new Date(now.getTime() - 76 * 60 * 60 * 1000), // 3 days ago
        contactId: 'contact-10'
      }
    ];

    return mockActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const recentActivities = getRecentActivities();

  // Group activities by date
  const getActivitiesByDate = () => {
    const activitiesByDate: { [key: string]: typeof recentActivities } = {};
    
    recentActivities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const dateKey = date.toDateString();
      
      if (!activitiesByDate[dateKey]) {
        activitiesByDate[dateKey] = [];
      }
      activitiesByDate[dateKey].push(activity);
    });

    return activitiesByDate;
  };

  const activitiesByDate = getActivitiesByDate();

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

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
                <p className="text-gray-600">Your networking activity and progress updates</p>
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

            {/* Networking Metrics Summary - Moved from Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  <span>Networking Metrics Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Scope</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span>Total Contacts</span>
                          </div>
                        </th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">
                          <div className="flex items-center space-x-1">
                            <UserPlus className="w-4 h-4 text-green-600" />
                            <span>New Contacts</span>
                          </div>
                        </th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Send className="w-4 h-4 text-purple-600" />
                            <span>Messages Sent</span>
                          </div>
                        </th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="w-4 h-4 text-orange-600" />
                            <span>Response Rate</span>
                          </div>
                        </th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">
                          <div className="flex items-center space-x-1">
                            <CalendarCheck className="w-4 h-4 text-emerald-600" />
                            <span>Meetings Completed</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Overall Row */}
                      <tr className="border-b border-gray-100 bg-blue-50/30">
                        <td className="py-4 px-3">
                          <div className="flex items-center space-x-2">
                            <Network className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-blue-900">Overall</span>
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <span className="text-lg font-bold text-blue-900">{stats.totalContacts}</span>
                        </td>
                        <td className="py-4 px-3">
                          <span className="text-lg font-bold text-green-600">{activitySummary.newConnections}</span>
                        </td>
                        <td className="py-4 px-3">
                          <span className="text-lg font-bold text-purple-600">{activitySummary.messagesSent}</span>
                        </td>
                        <td className="py-4 px-3">
                          <span className="text-lg font-bold text-orange-600">{activitySummary.responseRate}%</span>
                        </td>
                        <td className="py-4 px-3">
                          <span className="text-lg font-bold text-emerald-600">{activitySummary.newMeetings}</span>
                        </td>
                      </tr>
                      
                      {/* Target Companies Row */}
                      <tr className="border-b border-gray-100 bg-green-50/30">
                        <td className="py-4 px-3">
                          <div className="flex items-center space-x-2">
                            <Target className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-900">Target Companies</span>
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <span className="text-lg font-bold text-blue-900">{targetCompanyMetrics.totalContacts}</span>
                        </td>
                        <td className="py-4 px-3">
                          <span className="text-lg font-bold text-green-600">{targetCompanyMetrics.newContacts}</span>
                        </td>
                        <td className="py-4 px-3">
                          <span className="text-lg font-bold text-purple-600">{targetCompanyMetrics.messagesSent}</span>
                        </td>
                        <td className="py-4 px-3">
                          <span className="text-lg font-bold text-orange-600">{targetCompanyMetrics.responseRate}%</span>
                        </td>
                        <td className="py-4 px-3">
                          <span className="text-lg font-bold text-emerald-600">{targetCompanyMetrics.meetingsCompleted}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Feed - Organized by Date */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ActivityIcon className="w-5 h-5 text-green-500" />
                  <span>Recent Activity</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {recentActivities.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(activitiesByDate).map(([dateString, dayActivities]) => (
                    <div key={dateString} className="space-y-3">
                      {/* Date Header */}
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {formatDateHeader(dateString)}
                        </h3>
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <Badge variant="outline" className="text-xs">
                          {dayActivities.length} activities
                        </Badge>
                      </div>
                      
                      {/* Activities for this date */}
                      <div className="space-y-3">
                        {dayActivities.map((activity) => {
                          const Icon = getActivityIcon(activity.type);
                          const colorClass = getActivityColor(activity.type);
                          
                          return (
                            <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg ml-4">
                              <div className={`p-2 rounded-full bg-white ${colorClass}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                                <p className="text-xs text-gray-500 mt-1">{formatActivityTime(activity.timestamp)}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-400">
                                  {new Date(activity.timestamp).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                                <ArrowRight className="w-3 h-3 text-gray-400" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}