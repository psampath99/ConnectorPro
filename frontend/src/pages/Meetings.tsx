import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TargetCompaniesModal } from '@/components/modals/TargetCompaniesModal';
import { CalendarInviteModal } from '@/components/modals/CalendarInviteModal';
import { storage } from '@/lib/storage';
import { Meeting, Contact } from '@/types';
import { 
  Calendar, 
  Search, 
  Video, 
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  CalendarDays,
  ExternalLink,
  Copy,
  Building2,
  Target,
  Lightbulb,
  Settings
} from 'lucide-react';

const Meetings = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<string>('all');
  const [filterTargetCompany, setFilterTargetCompany] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<string>('7');
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  useEffect(() => {
    const loadedMeetings = storage.getMeetings();
    const loadedContacts = storage.getContacts();
    
    setMeetings(loadedMeetings);
    setContacts(loadedContacts);
    loadTargetCompanies();
  }, []);

  const loadTargetCompanies = () => {
    // Get target companies from onboarding with fallback
    const companies = localStorage.getItem('connectorpro_target_companies');
    let parsedCompanies = [];
    
    if (companies) {
      try {
        parsedCompanies = JSON.parse(companies);
      } catch (error) {
        console.error('Error parsing target companies:', error);
        parsedCompanies = ['Meta', 'Stripe', 'Airbnb']; // Fallback
      }
    } else {
      // Set default target companies if none exist
      parsedCompanies = ['Meta', 'Stripe', 'Airbnb'];
      localStorage.setItem('connectorpro_target_companies', JSON.stringify(parsedCompanies));
    }
    
    setTargetCompanies(parsedCompanies);
  };

  const handleTargetCompaniesUpdate = () => {
    loadTargetCompanies();
  };

  // Get company logo URL
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

  // Get meetings by company with statistics
  const getMeetingsByCompanyStats = () => {
    // Get all companies from meetings
    const allCompanies = new Set<string>();
    
    meetings.forEach(meeting => {
      meeting.attendees.forEach(attendeeId => {
        const contact = contacts.find(c => c.id === attendeeId);
        if (contact?.company) {
          allCompanies.add(contact.company);
        }
      });
    });

    // Calculate stats for each company
    const companyStats = Array.from(allCompanies).map(company => {
      const companyMeetings = meetings.filter(meeting => {
        return meeting.attendees.some(attendeeId => {
          const contact = contacts.find(c => c.id === attendeeId);
          return contact?.company === company;
        });
      });

      const scheduled = companyMeetings.filter(m => m.status === 'scheduled').length;
      const completed = companyMeetings.filter(m => m.status === 'completed').length;
      const cancelled = companyMeetings.filter(m => m.status === 'cancelled').length;
      const total = companyMeetings.length;

      return {
        company,
        scheduled,
        completed,
        cancelled,
        total,
        isTargetCompany: targetCompanies.includes(company)
      };
    });

    // Sort by target companies first, then by total meetings
    return companyStats.sort((a, b) => {
      if (a.isTargetCompany && !b.isTargetCompany) return -1;
      if (!a.isTargetCompany && b.isTargetCompany) return 1;
      return b.total - a.total;
    });
  };

  const getFilteredMeetings = () => {
    let filtered = meetings;

    // Filter by timeframe
    const now = new Date();
    if (filterTimeframe === 'upcoming') {
      filtered = filtered.filter(meeting => new Date(meeting.startTime) > now);
    } else if (filterTimeframe === 'past') {
      filtered = filtered.filter(meeting => new Date(meeting.startTime) <= now);
    } else if (filterTimeframe === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filtered = filtered.filter(meeting => {
        const meetingDate = new Date(meeting.startTime);
        return meetingDate >= today && meetingDate < tomorrow;
      });
    } else if (filterTimeframe === 'this_week') {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      filtered = filtered.filter(meeting => {
        const meetingDate = new Date(meeting.startTime);
        return meetingDate >= startOfWeek && meetingDate < endOfWeek;
      });
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(meeting => meeting.status === filterStatus);
    }

    // Filter by company
    if (filterTargetCompany !== 'all') {
      filtered = filtered.filter(meeting => {
        const attendeeCompanies = meeting.attendees.map(attendeeId => {
          const contact = contacts.find(c => c.id === attendeeId);
          return contact?.company || '';
        });

        if (filterTargetCompany === 'other') {
          return !attendeeCompanies.some(company => targetCompanies.includes(company));
        } else {
          return attendeeCompanies.includes(filterTargetCompany);
        }
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(meeting => {
        const attendeeNames = meeting.attendees.map(attendeeId => {
          const contact = contacts.find(c => c.id === attendeeId);
          return contact?.name || '';
        }).join(' ');
        
        return meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
               attendeeNames.toLowerCase().includes(searchTerm.toLowerCase()) ||
               meeting.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    return filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const filteredMeetings = getFilteredMeetings();

  // Group meetings by target companies - simplified logic
  const getMeetingsByCompany = (company: string) => {
    const companyMeetings = meetings.filter(meeting => {
      const attendeeCompanies = meeting.attendees.map(attendeeId => {
        const contact = contacts.find(c => c.id === attendeeId);
        return contact?.company;
      });
      const hasCompany = attendeeCompanies.includes(company);
      return hasCompany;
    });
    
    return companyMeetings;
  };

  const getOtherMeetings = () => {
    return meetings.filter(meeting => {
      const attendeeCompanies = meeting.attendees.map(attendeeId => {
        const contact = contacts.find(c => c.id === attendeeId);
        return contact?.company || '';
      });
      return !attendeeCompanies.some(company => targetCompanies.includes(company));
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-emerald-100 text-emerald-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case  'scheduled': return Calendar;
      case 'completed': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return Calendar;
    }
  };

  const handleEdit = (meetingId: string) => {
    console.log('Edit meeting:', meetingId);
  };

  const handleComplete = (meetingId: string) => {
    const updatedMeetings = meetings.map(meeting => 
      meeting.id === meetingId 
        ? { ...meeting, status: 'completed' as const }
        : meeting
    );
    setMeetings(updatedMeetings);
    storage.setMeetings(updatedMeetings);
  };

  const handleCancel = (meetingId: string) => {
    const updatedMeetings = meetings.map(meeting => 
      meeting.id === meetingId 
        ? { ...meeting, status: 'cancelled' as const }
        : meeting
    );
    setMeetings(updatedMeetings);
    storage.setMeetings(updatedMeetings);
  };

  const handleDelete = (meetingId: string) => {
    const updatedMeetings = meetings.filter(meeting => meeting.id !== meetingId);
    setMeetings(updatedMeetings);
    storage.setMeetings(updatedMeetings);
  };

  const copyMeetingLink = (meetLink: string) => {
    navigator.clipboard.writeText(meetLink);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const companyStats = getMeetingsByCompanyStats();

  const MeetingCard = ({ meeting }: { meeting: Meeting }) => {
    const attendeeContacts = meeting.attendees.map(attendeeId => 
      contacts.find(c => c.id === attendeeId)
    ).filter(Boolean);
    const StatusIcon = getStatusIcon(meeting.status);
    const meetingDate = new Date(meeting.startTime);

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mb-2">
                <Calendar className="w-5 h-5 text-teal-600" />
              </div>
              <Badge className={getStatusColor(meeting.status)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {meeting.status}
              </Badge>
              
              {/* Dropdown Menu for Scheduled Meetings */}
              {meeting.status === 'scheduled' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 h-6 w-6 p-0 hover:bg-gray-100"
                    >
                      <Settings className="w-3 h-3 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-32">
                    <DropdownMenuItem onClick={() => handleEdit(meeting.id)}>
                      <Edit className="w-3 h-3 mr-2 text-gray-600" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleComplete(meeting.id)}>
                      <CheckCircle className="w-3 h-3 mr-2 text-green-600" />
                      Complete
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleCancel(meeting.id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <XCircle className="w-3 h-3 mr-2" />
                      Cancel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="font-medium text-gray-900">{meeting.title}</h4>
                {isToday(meetingDate) && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    Today
                  </Badge>
                )}
                {isTomorrow(meetingDate) && (
                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                    Tomorrow
                  </Badge>
                )}
              </div>
              
              {/* Date and Time */}
              <div className="flex items-center space-x-4 mb-2 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <CalendarDays className="w-4 h-4" />
                  <span>Date: {formatDateTime(meetingDate)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{meeting.duration} min</span>
                </div>
              </div>

              {/* Attendees */}
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-gray-500" />
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Attendee:</span>
                  {attendeeContacts.slice(0, 2).map((contact) => (
                    <div key={contact?.id} className="flex items-center space-x-1">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="bg-gray-100 text-xs">
                          {contact?.name.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-700">{contact?.name}</span>
                    </div>
                  ))}
                  {attendeeContacts.length > 2 && (
                    <span className="text-sm text-gray-500">
                      +{attendeeContacts.length - 2} more
                    </span>
                  )}
                </div>
              </div>

              {/* Meeting Link */}
              {meeting.meetLink && (
                <div className="flex items-center space-x-2 mb-2">
                  <Video className="w-4 h-4 text-gray-500" />
                  <div className="flex items-center space-x-2">
                    <a 
                      href={meeting.meetLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-teal-600 hover:text-teal-800 flex items-center space-x-1"
                    >
                      <span>Join Meeting</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyMeetingLink(meeting.meetLink!)}
                      className="h-5 px-1"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Notes */}
              {meeting.notes && (
                <div className="bg-gray-50 rounded-lg p-2 mb-2">
                  <p className="text-xs text-gray-700">{meeting.notes}</p>
                </div>
              )}

              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                Created: {new Date(meeting.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Right Side Actions - Keep existing for non-scheduled meetings */}
          <div className="flex items-center space-x-1 ml-4">
            {meeting.status !== 'scheduled' && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => handleDelete(meeting.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
                <p className="text-gray-600">Manage your scheduled meetings and calls</p>
              </div>
              <div className="flex items-center space-x-3">
                <TargetCompaniesModal onUpdate={handleTargetCompaniesUpdate} />
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

            {/* Summary by Company - Table Format */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span>Meetings by Company</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Company</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Scheduled</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Completed</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Cancelled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyStats.map((stat, index) => (
                        <tr 
                          key={stat.company} 
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="relative w-8 h-8">
                                <img 
                                  src={getCompanyLogo(stat.company)} 
                                  alt={`${stat.company} logo`}
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
                                <div className="absolute inset-0 w-8 h-8 bg-teal-100 rounded-md flex items-center justify-center text-teal-600 font-semibold text-sm">
                                  {stat.company.charAt(0)}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{stat.company}</span>
                                {stat.isTargetCompany && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    <Target className="w-3 h-3 mr-1" />
                                    Target
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-full">
                              <span className="text-sm font-bold text-emerald-900">{stat.scheduled}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                              <span className="text-sm font-bold text-green-900">{stat.completed}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="inline-flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">
                              <span className="text-sm font-bold text-red-900">{stat.cancelled}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Filters and Actions */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Top Row: Schedule Meeting Button + Search */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <Button
                      className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700"
                      onClick={() => setIsCalendarModalOpen(true)}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Schedule Meeting</span>
                    </Button>

                    {/* Search Bar */}
                    <div className="w-full sm:w-80">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search meetings by title, attendee, or notes..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Filter Dropdowns - Status, Timeframe, Company */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterTimeframe} onValueChange={setFilterTimeframe}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="this_week">This Week</SelectItem>
                        <SelectItem value="past">Past</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterTargetCompany} onValueChange={setFilterTargetCompany}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Companies</SelectItem>
                        <SelectItem value="other">Other Companies</SelectItem>
                        {targetCompanies.map((company) => (
                          <SelectItem key={company} value={company}>
                            <div className="flex items-center">
                              <Target className="w-3 h-3 mr-2 text-teal-600" />
                              {company}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meetings by Target Company */}
            {targetCompanies.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-6 h-6 text-amber-500" />
                  <h2 className="text-xl font-bold text-gray-900">Meetings by Target Company</h2>
                </div>

                {targetCompanies.map((company) => {
                  const companyMeetings = getMeetingsByCompany(company);
                  
                  const companyStats = {
                    total: companyMeetings.length,
                    scheduled: companyMeetings.filter(m => m.status === 'scheduled').length,
                    completed: companyMeetings.filter(m => m.status === 'completed').length,
                    cancelled: companyMeetings.filter(m => m.status === 'cancelled').length
                  };

                  return (
                    <Card key={company} className="border-l-4 border-l-teal-500">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Building2 className="w-6 h-6 text-teal-600" />
                            <span>{company}</span>
                            <Badge variant="secondary" className="bg-teal-100 text-teal-800">
                              {companyMeetings.length} meetings
                            </Badge>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            <Target className="w-3 h-3 mr-1" />
                            Target Company
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Company Stats */}
                          <div className="grid grid-cols-4 gap-4 p-4 bg-teal-50 rounded-lg">
                            <div className="text-center">
                              <p className="text-lg font-bold text-teal-900">{companyStats.total}</p>
                              <p className="text-xs text-teal-700">Total</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-emerald-600">{companyStats.scheduled}</p>
                              <p className="text-xs text-teal-700">Scheduled</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-600">{companyStats.completed}</p>
                              <p className="text-xs text-teal-700">Completed</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-red-600">{companyStats.cancelled}</p>
                              <p className="text-xs text-teal-700">Cancelled</p>
                            </div>
                          </div>

                          {/* Meetings for this company */}
                          {companyMeetings.length > 0 ? (
                            <div className="space-y-3">
                              {companyMeetings.map((meeting) => (
                                <MeetingCard key={meeting.id} meeting={meeting} />
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm">No meetings with {company} yet</p>
                              <p className="text-xs">Schedule your first meeting to get started</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Other Companies Meetings */}
            {getOtherMeetings().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <Building2 className="w-6 h-6 text-gray-600" />
                    <span>Other Companies</span>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      {getOtherMeetings().length} meetings
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getOtherMeetings().map((meeting) => (
                      <MeetingCard key={meeting.id} meeting={meeting} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Meetings Found */}
            {filteredMeetings.length === 0 && meetings.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No meetings found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Schedule your first meeting to get started
                  </p>
                  <Button
                    className="bg-teal-600 hover:bg-teal-700"
                    onClick={() => setIsCalendarModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      
      {/* Calendar Invite Modal */}
      <CalendarInviteModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
      />
    </div>
  );
};

export default Meetings;