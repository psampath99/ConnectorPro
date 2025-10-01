import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TargetCompaniesModal } from '@/components/modals/TargetCompaniesModal';
import { GmailComposeModal } from '@/components/modals/GmailComposeModal';
import { CalendarInviteModal } from '@/components/modals/CalendarInviteModal';
import { storage } from '@/lib/storage';
import { Contact } from '@/types';
import { 
  Search, 
  Filter, 
  Users, 
  Building2, 
  GraduationCap, 
  Calendar,
  Star,
  MessageSquare,
  Mail,
  MoreHorizontal,
  Linkedin,
  Database,
  TrendingUp,
  Target,
  CheckCircle,
  ChevronDown,
  Lightbulb,
  ArrowRight,
  UserPlus,
  Send,
  Route,
  Settings,
  Link,
  Network,
  Check,
  Clock,
  X
} from 'lucide-react';

const Contacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDegree, setFilterDegree] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<string>('7');
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
    // Load contacts from both localStorage and API
    const localContacts = storage.getContacts();
    setContacts(localContacts);
    
    // Also fetch from API for real-time updates
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
    // Get target companies from onboarding with fallback
    const companies = localStorage.getItem('connectorpro_target_companies');
    if (companies) {
      try {
        setTargetCompanies(JSON.parse(companies));
      } catch (error) {
        console.error('Error parsing target companies:', error);
        // Fallback to default target companies
        setTargetCompanies(['Meta', 'Stripe', 'Airbnb']);
      }
    } else {
      // Fallback to default target companies if none found
      setTargetCompanies(['Meta', 'Stripe', 'Airbnb']);
    }
  };

  const handleTargetCompaniesUpdate = () => {
    loadTargetCompanies();
  };

  // All-time data (for summary stats)
  const allTimeContacts = contacts;
  const allTimeCompanies = [...new Set(allTimeContacts.map(c => c.company))];

  // Get contacts for a specific target company
  const getTargetCompanyContacts = (company: string) => {
    return allTimeContacts.filter(c => c.company === company);
  };

  // Get potential bridge contacts for a 2nd degree connection with enhanced logic
  const getPotentialBridges = (targetContact: Contact) => {
    // Find 1st degree contacts from different companies who might know this person
    const firstDegreeContacts = contacts.filter(contact => 
      contact.degree === 1 && 
      contact.company !== targetContact.company
    );

    // Create bridge options with mock confidence and reasoning
    const bridgeOptions = firstDegreeContacts.map(bridge => {
      let confidence = 0.7;
      let reason = 'Professional network overlap';

      // Enhanced logic based on commonalities
      const sharedCommonalities = bridge.commonalities.filter(bridgeComm =>
        targetContact.commonalities.some(targetComm => 
          bridgeComm.type === targetComm.type
        )
      );

      if (sharedCommonalities.length > 0) {
        const bestCommonality = sharedCommonalities[0];
        switch (bestCommonality.type) {
          case 'employer':
            confidence = 0.95;
            reason = `Both worked at ${bestCommonality.description.split(' ').slice(-1)[0] || 'same company'}`;
            break;
          case 'education':
            confidence = 0.88;
            reason = `${bestCommonality.description} connection`;
            break;
          case 'mutual':
            confidence = 0.85;
            reason = 'Mutual connections';
            break;
          case 'event':
            confidence = 0.78;
            reason = `${bestCommonality.description} community`;
            break;
          default:
            confidence = 0.75;
            reason = 'Professional network overlap';
        }
      }

      // Add some variation for demo purposes
      if (bridge.name.includes('Alex')) confidence = 0.95;
      if (bridge.name.includes('Lisa')) confidence = 0.88;
      if (bridge.name.includes('Rachel')) confidence = 0.82;
      if (bridge.name.includes('Kevin')) confidence = 0.75;

      return {
        ...bridge,
        confidence,
        reason
      };
    });

    return bridgeOptions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4); // Return top 4 potential bridges
  };

  // Data sources with their current status and metrics
  const dataSourcesData = [
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      connections: allTimeContacts.length,
      companies: allTimeCompanies.length,
      status: 'connected',
      statusColor: 'green'
    },
    {
      id: 'crm',
      name: 'CRM',
      icon: Database,
      connections: 0,
      companies: 0,
      status: 'not_connected',
      statusColor: 'gray'
    },
    {
      id: 'email',
      name: 'Email',
      icon: Mail,
      connections: 0,
      companies: 0,
      status: 'in_progress',
      statusColor: 'yellow'
    },
    {
      id: 'calendar',
      name: 'Calendar',
      icon: Calendar,
      connections: 0,
      companies: 0,
      status: 'not_connected',
      statusColor: 'gray'
    }
  ];

  const getStatusBadge = (status: string, statusColor: string) => {
    const statusConfig = {
      connected: {
        text: 'Connected',
        icon: CheckCircle,
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      in_progress: {
        text: 'In Progress',
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      },
      not_connected: {
        text: 'Not Connected',
        icon: X,
        className: 'bg-gray-100 text-gray-600 border-gray-200'
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const StatusIcon = config.icon;

    return (
      <Badge variant="outline" className={config.className}>
        <StatusIcon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const handleRequestIntro = (bridgeContactId: string, targetContactId: string) => {
    const bridge = contacts.find(c => c.id === bridgeContactId);
    const target = contacts.find(c => c.id === targetContactId);
    console.log(`Request intro via ${bridge?.name} to ${target?.name}`);
    // This would typically open a modal or navigate to draft creation
  };

  const handleDirectMessage = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      setSelectedContact(contact);
      setIsGmailModalOpen(true);
    }
  };

  const handleScheduleMeeting = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      setSelectedContact(contact);
      setIsCalendarModalOpen(true);
    }
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
                <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
                <p className="text-gray-600">Manage your network and bridge connections</p>
              </div>
              <div className="flex items-center space-x-3">
                <TargetCompaniesModal 
                  onUpdate={handleTargetCompaniesUpdate}
                  trigger={
                    <Button variant="outline" size="sm" className="flex items-center space-x-2">
                      <Settings className="w-4 h-4" />
                      <span>Edit Targets</span>
                    </Button>
                  }
                />
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

            {/* Data Sources - Simplified Row Format */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Data Sources</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Source</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Connections</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Companies</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataSourcesData.map((source, index) => (
                        <tr 
                          key={source.id} 
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 bg-${source.statusColor === 'green' ? 'blue' : source.statusColor === 'yellow' ? 'yellow' : 'gray'}-100 rounded-lg flex items-center justify-center`}>
                                <source.icon className={`w-4 h-4 text-${source.statusColor === 'green' ? 'blue' : source.statusColor === 'yellow' ? 'yellow' : 'gray'}-600`} />
                              </div>
                              <span className="font-medium text-gray-900">{source.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-lg font-bold text-gray-900">{source.connections}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-lg font-bold text-gray-900">{source.companies}</span>
                          </td>
                          <td className="py-4 px-4">
                            {getStatusBadge(source.status, source.statusColor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Search and Filters - MOVED BEFORE TARGET COMPANIES */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search contacts by name, company, or title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select value={filterDegree} onValueChange={setFilterDegree}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by degree" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Degrees</SelectItem>
                      <SelectItem value="1">1st Degree</SelectItem>
                      <SelectItem value="2">2nd Degree</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Contacts by Target Company */}
            {targetCompanies.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  
                  <Lightbulb className="w-6 h-6 text-orange-500" />
                  <h2 className="text-xl font-bold text-gray-900">Contacts by Target Company</h2>
                </div>

                {targetCompanies.map((company) => {
                  const companyContacts = getTargetCompanyContacts(company);
                  const firstDegree = companyContacts.filter(c => c.degree === 1);
                  const secondDegree = companyContacts.filter(c => c.degree === 2);

                  return (
                    <Card key={company} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Building2 className="w-6 h-6 text-blue-600" />
                            <span>{company}</span>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {companyContacts.length} contacts
                            </Badge>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            <Target className="w-3 h-3 mr-1" />
                            Target Company
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Company Stats */}
                          <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                            <div className="text-center">
                              <p className="text-lg font-bold text-blue-900">{companyContacts.length}</p>
                              <p className="text-xs text-blue-700">Total Contacts</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-600">{firstDegree.length}</p>
                              <p className="text-xs text-blue-700">1st Degree</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-yellow-600">{secondDegree.length}</p>
                              <p className="text-xs text-blue-700">2nd Degree</p>
                            </div>
                          </div>

                          {/* 1st Degree Contacts */}
                          {firstDegree.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">1st Degree Connections ({firstDegree.length})</h4>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {firstDegree.slice(0, 4).map((contact) => (
                                  <div key={contact.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <h5 className="font-medium text-gray-900">{contact.name}</h5>
                                        <div className="flex items-center space-x-2">
                                          <Button
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => handleDirectMessage(contact.id)}
                                          >
                                            <MessageSquare className="w-3 h-3 mr-1" />
                                            Message
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => handleScheduleMeeting(contact.id)}
                                          >
                                            <Calendar className="w-3 h-3 mr-1" />
                                            Meet
                                          </Button>
                                        </div>
                                      </div>
                                      <p className="text-sm text-gray-600">{contact.company} - {contact.title}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {firstDegree.length > 4 && (
                                <Button variant="ghost" size="sm" className="w-full mt-2">
                                  View all {firstDegree.length} 1st degree connections
                                </Button>
                              )}
                            </div>
                          )}

                          {/* 2nd Degree Connections - WITH WORKING DROPDOWN */}
                          {secondDegree.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">2nd Degree Connections ({secondDegree.length})</h4>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {secondDegree.slice(0, 5).map((contact) => {
                                  const potentialBridges = getPotentialBridges(contact);
                                  return (
                                    <div key={contact.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <h5 className="font-medium text-gray-900">{contact.name}</h5>
                                          <div className="flex items-center space-x-2">
                                            <Button 
                                              size="sm" 
                                              variant="outline" 
                                              className="h-7 px-2 text-xs"
                                              onClick={() => handleDirectMessage(contact.id)}
                                            >
                                              <MessageSquare className="w-3 h-3 mr-1" />
                                              Direct
                                            </Button>
                                            {potentialBridges.length > 0 && (
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button size="sm" className="h-7 px-2 text-xs">
                                                    <Send className="w-3 h-3 mr-1" />
                                                    Request Intro
                                                    <ChevronDown className="w-3 h-3 ml-1" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-72">
                                                  <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b">
                                                    Choose bridge contact:
                                                  </div>
                                                  {potentialBridges.map((bridge) => (
                                                    <DropdownMenuItem
                                                      key={bridge.id}
                                                      onClick={() => handleRequestIntro(bridge.id, contact.id)}
                                                      className="flex flex-col items-start py-3 px-3 cursor-pointer"
                                                    >
                                                      <div className="flex items-center justify-between w-full">
                                                        <span className="font-medium text-sm">{bridge.name}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                          {Math.round(bridge.confidence * 100)}%
                                                        </Badge>
                                                      </div>
                                                      <div className="text-xs text-gray-600 mt-1">
                                                        {bridge.company} • {bridge.reason}
                                                      </div>
                                                    </DropdownMenuItem>
                                                  ))}
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            )}
                                          </div>
                                        </div>
                                        <p className="text-sm text-gray-600">{contact.company} - {contact.title}</p>
                                        {potentialBridges.length > 0 && (
                                          <p className="text-xs text-gray-500">
                                            {potentialBridges.length} bridge option{potentialBridges.length > 1 ? 's' : ''} available
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {secondDegree.length > 5 && (
                                <Button variant="ghost" size="sm" className="w-full mt-2">
                                  View all {secondDegree.length} 2nd degree connections
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Gmail Compose Modal */}
      <GmailComposeModal
        isOpen={isGmailModalOpen}
        onClose={() => {
          setIsGmailModalOpen(false);
          setSelectedContact(null);
        }}
        prefilledTo={selectedContact?.email || ''}
        prefilledSubject={selectedContact ? `Following up - ${selectedContact.name}` : ''}
        prefilledBody={selectedContact ? `Hi ${selectedContact.name.split(' ')[0]},\n\nI hope this message finds you well.\n\nBest regards` : ''}
      />
      
      {/* Calendar Invite Modal */}
      <CalendarInviteModal
        isOpen={isCalendarModalOpen}
        onClose={() => {
          setIsCalendarModalOpen(false);
          setSelectedContact(null);
        }}
        prefilledTitle={selectedContact ? `Meeting with ${selectedContact.name}` : ''}
        prefilledAttendees={selectedContact?.email ? [selectedContact.email] : []}
        prefilledDescription={selectedContact ? `Meeting with ${selectedContact.name} from ${selectedContact.company}` : ''}
      />
    </div>
  );
};

export default Contacts;