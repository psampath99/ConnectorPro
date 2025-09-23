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
import { FloatingAIButton } from '@/components/ui/floating-ai-button';
import { storage } from '@/lib/storage';
import { Draft, Contact } from '@/types';
import { 
  MessageSquare, 
  Search, 
  Send,
  Edit,
  Trash2,
  Archive,
  Clock,
  CheckCircle,
  Building2,
  Target,
  Lightbulb,
  Plus,
  Settings,
  TrendingUp
} from 'lucide-react';

const Messages = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTargetCompany, setFilterTargetCompany] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<string>('7');
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);

  useEffect(() => {
    const loadedDrafts = storage.getDrafts();
    const loadedContacts = storage.getContacts();
    
    setDrafts(loadedDrafts);
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

  // Get messages by company with new statistics
  const getMessagesByCompanyStats = () => {
    // Get all companies from messages
    const allCompanies = new Set<string>();
    
    drafts.forEach(draft => {
      const contact = contacts.find(c => c.id === draft.targetContactId);
      if (contact?.company) {
        allCompanies.add(contact.company);
      }
    });

    // Calculate stats for each company
    const companyStats = Array.from(allCompanies).map(company => {
      const companyMessages = drafts.filter(draft => {
        const contact = contacts.find(c => c.id === draft.targetContactId);
        return contact?.company === company;
      });

      const messagesSent = companyMessages.filter(m => m.status === 'sent').length;
      
      // Simulate messages received (in a real app, this would come from actual data)
      // Use a realistic response rate between 20-60% based on company and message count
      const companyIndex = Array.from(allCompanies).indexOf(company);
      const baseResponseRate = 0.3 + (companyIndex % 4) * 0.1; // 30%, 40%, 50%, 60%
      const messagesReceived = Math.floor(messagesSent * baseResponseRate);
      
      // Calculate response rate
      const responseRate = messagesSent > 0 ? Math.round((messagesReceived / messagesSent) * 100) : 0;

      return {
        company,
        messagesSent,
        messagesReceived,
        responseRate,
        total: companyMessages.length,
        isTargetCompany: targetCompanies.includes(company)
      };
    });

    // Sort by target companies first, then by messages sent
    return companyStats.sort((a, b) => {
      if (a.isTargetCompany && !b.isTargetCompany) return -1;
      if (!a.isTargetCompany && b.isTargetCompany) return 1;
      return b.messagesSent - a.messagesSent;
    });
  };

  const getFilteredMessages = () => {
    let filtered = drafts;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(draft => draft.status === filterStatus);
    }

    // Filter by company
    if (filterTargetCompany !== 'all') {
      filtered = filtered.filter(draft => {
        const contact = contacts.find(c => c.id === draft.targetContactId);
        const company = contact?.company || '';

        if (filterTargetCompany === 'other') {
          return !targetCompanies.includes(company);
        } else {
          return company === filterTargetCompany;
        }
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(draft => {
        const contact = contacts.find(c => c.id === draft.targetContactId);
        const contactName = contact?.name || '';
        const contactCompany = contact?.company || '';
        
        return draft.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               draft.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
               contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               contactCompany.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  };

  const filteredMessages = getFilteredMessages();

  // Group messages by target companies
  const getMessagesByCompany = (company: string) => {
    return drafts.filter(draft => {
      const contact = contacts.find(c => c.id === draft.targetContactId);
      return contact?.company === company;
    });
  };

  const getOtherMessages = () => {
    return drafts.filter(draft => {
      const contact = contacts.find(c => c.id === draft.targetContactId);
      const company = contact?.company || '';
      return !targetCompanies.includes(company);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return Edit;
      case 'sent': return Send;
      case 'archived': return Archive;
      default: return MessageSquare;
    }
  };

  const getResponseRateColor = (rate: number) => {
    if (rate >= 50) return 'text-green-600';
    if (rate >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleEdit = (draftId: string) => {
    console.log('Edit message:', draftId);
  };

  const handleSend = (draftId: string) => {
    const updatedDrafts = drafts.map(draft => 
      draft.id === draftId 
        ? { ...draft, status: 'sent' as const, sentAt: new Date() }
        : draft
    );
    setDrafts(updatedDrafts);
    storage.setDrafts(updatedDrafts);
  };

  const handleArchive = (draftId: string) => {
    const updatedDrafts = drafts.map(draft => 
      draft.id === draftId 
        ? { ...draft, status: 'archived' as const }
        : draft
    );
    setDrafts(updatedDrafts);
    storage.setDrafts(updatedDrafts);
  };

  const handleDelete = (draftId: string) => {
    const updatedDrafts = drafts.filter(draft => draft.id !== draftId);
    setDrafts(updatedDrafts);
    storage.setDrafts(updatedDrafts);
  };

  const formatDateTime = (date: Date | string | undefined | null) => {
    if (!date) return 'Unknown date';
    
    try {
      // Convert to Date object if it's a string
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const companyStats = getMessagesByCompanyStats();

  const MessageCard = ({ draft }: { draft: Draft }) => {
    const contact = contacts.find(c => c.id === draft.targetContactId);
    const StatusIcon = getStatusIcon(draft.status);

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <Badge className={getStatusColor(draft.status)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {draft.status}
              </Badge>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="font-medium text-gray-900">{draft.subject || 'No subject'}</h4>
              </div>
              
              {/* Recipient */}
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-gray-700">To:</span>
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="bg-gray-100 text-xs">
                    {contact?.name.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-700">{contact?.name || 'Unknown contact'}</span>
                <span className="text-sm text-gray-500">at {contact?.company || 'Unknown company'}</span>
              </div>

              {/* Content Preview */}
              <div className="bg-gray-50 rounded-lg p-2 mb-2">
                <p className="text-xs text-gray-700 line-clamp-2">
                  {draft.content ? draft.content.substring(0, 150) + '...' : 'No content'}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {draft.status === 'sent' && draft.sentAt 
                    ? `Sent: ${formatDateTime(draft.sentAt)}`
                    : `Created: ${formatDateTime(draft.createdAt)}`
                  }
                </div>
                {draft.type && (
                  <Badge variant="outline" className="text-xs">
                    {draft.type.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 ml-4">
            {draft.status === 'draft' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleEdit(draft.id)}
                  className="text-blue-600 border-blue-200"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleSend(draft.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="w-3 h-3" />
                </Button>
              </>
            )}
            {draft.status === 'sent' && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleArchive(draft.id)}
                className="text-gray-600 border-gray-200"
              >
                <Archive className="w-3 h-3" />
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => handleDelete(draft.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
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
                <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                <p className="text-gray-600">Manage your message drafts and sent messages</p>
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

            {/* Messages Performance by Company - New Table Format */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Messages Performance by Company</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Company</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Messages Sent</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Messages Received</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Response Rate</th>
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
                                <div className="absolute inset-0 w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center text-blue-600 font-semibold text-sm">
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
                            <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                              <span className="text-sm font-bold text-blue-900">{stat.messagesSent}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                              <span className="text-sm font-bold text-green-900">{stat.messagesReceived}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center">
                              <span className={`text-lg font-bold ${getResponseRateColor(stat.responseRate)}`}>
                                {stat.responseRate}%
                              </span>
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
                  {/* Top Row: Compose Message Button + Search */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4" />
                      <span>Compose Message</span>
                    </Button>

                    {/* Search Bar */}
                    <div className="w-full sm:w-80">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search messages by subject, content, or recipient..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Filter Dropdowns - Status, Company */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
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
                              <Target className="w-3 h-3 mr-2 text-blue-600" />
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

            {/* Messages by Target Company */}
            {targetCompanies.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-6 h-6 text-amber-500" />
                  <h2 className="text-xl font-bold text-gray-900">Messages by Target Company</h2>
                </div>

                {targetCompanies.map((company) => {
                  const companyMessages = getMessagesByCompany(company);
                  
                  const companyStats = {
                    total: companyMessages.length,
                    draft: companyMessages.filter(m => m.status === 'draft').length,
                    sent: companyMessages.filter(m => m.status === 'sent').length,
                    archived: companyMessages.filter(m => m.status === 'archived').length
                  };

                  return (
                    <Card key={company} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Building2 className="w-6 h-6 text-blue-600" />
                            <span>{company}</span>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {companyMessages.length} messages
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
                          <div className="grid grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                            <div className="text-center">
                              <p className="text-lg font-bold text-blue-900">{companyStats.total}</p>
                              <p className="text-xs text-blue-700">Total</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-yellow-600">{companyStats.draft}</p>
                              <p className="text-xs text-blue-700">Draft</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-600">{companyStats.sent}</p>
                              <p className="text-xs text-blue-700">Sent</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-gray-600">{companyStats.archived}</p>
                              <p className="text-xs text-blue-700">Archived</p>
                            </div>
                          </div>

                          {/* Messages for this company */}
                          {companyMessages.length > 0 ? (
                            <div className="space-y-3">
                              {companyMessages.map((draft) => (
                                <MessageCard key={draft.id} draft={draft} />
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm">No messages with {company} yet</p>
                              <p className="text-xs">Compose your first message to get started</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Other Companies Messages */}
            {getOtherMessages().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <Building2 className="w-6 h-6 text-gray-600" />
                    <span>Other Companies</span>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      {getOtherMessages().length} messages
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getOtherMessages().map((draft) => (
                      <MessageCard key={draft.id} draft={draft} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Messages Found */}
            {filteredMessages.length === 0 && drafts.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No messages found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Compose your first message to get started
                  </p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Compose Message
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      
      <FloatingAIButton />
    </div>
  );
};

export default Messages;