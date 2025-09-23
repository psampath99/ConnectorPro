import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { storage } from '@/lib/storage';
import { Draft, Contact } from '@/types';
import { 
  FileText, 
  Search, 
  MessageSquare, 
  Mail, 
  Linkedin,
  Send,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  Archive,
  Plus,
  Building2,
  GraduationCap,
  Users,
  Calendar,
  Star,
  Target,
  Lightbulb
} from 'lucide-react';

const Drafts = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);

  useEffect(() => {
    setDrafts(storage.getDrafts());
    setContacts(storage.getContacts());
    
    // Get target companies from onboarding
    const companies = localStorage.getItem('connectorpro_target_companies');
    if (companies) {
      setTargetCompanies(JSON.parse(companies));
    }
  }, []);

  const filteredDrafts = drafts.filter(draft => {
    const contact = contacts.find(c => c.id === draft.targetContactId);
    const matchesSearch = contact?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact?.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         draft.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         draft.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || draft.status === filterStatus;
    const matchesType = filterType === 'all' || draft.type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Group drafts by target companies
  const getDraftsByCompany = (company: string) => {
    return filteredDrafts.filter(draft => {
      const contact = contacts.find(c => c.id === draft.targetContactId);
      return contact?.company === company;
    });
  };

  const getOtherDrafts = () => {
    return filteredDrafts.filter(draft => {
      const contact = contacts.find(c => c.id === draft.targetContactId);
      return !targetCompanies.includes(contact?.company || '');
    });
  };

  const getCommonalityIcon = (type: string) => {
    switch (type) {
      case 'employer': return Building2;
      case 'education': return GraduationCap;
      case 'mutual': return Users;
      case 'event': return Calendar;
      case 'project': return Star;
      default: return Users;
    }
  };

  const getCommonalityColor = (type: string) => {
    switch (type) {
      case 'employer': return 'bg-blue-100 text-blue-800';
      case 'education': return 'bg-green-100 text-green-800';
      case 'mutual': return 'bg-purple-100 text-purple-800';
      case 'event': return 'bg-orange-100 text-orange-800';
      case 'project': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'linkedin_message': return Linkedin;
      case 'linkedin_inmail': return Linkedin;
      case 'gmail_intro': return Mail;
      case 'follow_up': return MessageSquare;
      default: return MessageSquare;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'linkedin_message': return 'LinkedIn Message';
      case 'linkedin_inmail': return 'LinkedIn InMail';
      case 'gmail_intro': return 'Gmail Introduction';
      case 'follow_up': return 'Follow-up Message';
      default: return type;
    }
  };

  const handleEdit = (draftId: string) => {
    console.log('Edit draft:', draftId);
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

  const handleDelete = (draftId: string) => {
    const updatedDrafts = drafts.filter(draft => draft.id !== draftId);
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

  const draftStats = {
    total: drafts.length,
    draft: drafts.filter(d => d.status === 'draft').length,
    sent: drafts.filter(d => d.status === 'sent').length,
    archived: drafts.filter(d => d.status === 'archived').length
  };

  const DraftCard = ({ draft }: { draft: Draft }) => {
    const contact = contacts.find(c => c.id === draft.targetContactId);
    const bridgeContact = draft.bridgeContactId ? contacts.find(c => c.id === draft.bridgeContactId) : null;
    const TypeIcon = getTypeIcon(draft.type);
    const CommonalityIcon = getCommonalityIcon(draft.commonalityUsed.type);

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-gray-100 text-xs">
                {contact?.name.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-gray-900">{contact?.name || 'Unknown Contact'}</h4>
                <Badge className={getStatusColor(draft.status)}>
                  {draft.status}
                </Badge>
                <Badge variant="outline" className="flex items-center space-x-1">
                  <TypeIcon className="w-3 h-3" />
                  <span className="text-xs">{getTypeLabel(draft.type)}</span>
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600 mb-1">{contact?.title}</p>
              
              {draft.subject && (
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Subject: {draft.subject}
                </p>
              )}
              
              {bridgeContact && (
                <div className="flex items-center space-x-1 mb-2">
                  <span className="text-xs text-gray-500">
                    Via: <span className="font-medium">{bridgeContact.name}</span>
                  </span>
                </div>
              )}

              {/* Commonality Used */}
              <div className="flex items-center space-x-2 mb-2">
                <Badge
                  variant="secondary"
                  className={`text-xs ${getCommonalityColor(draft.commonalityUsed.type)}`}
                >
                  <CommonalityIcon className="w-3 h-3 mr-1" />
                  {draft.commonalityUsed.description}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {draft.tone} tone
                </Badge>
              </div>

              {/* Draft Preview */}
              <div className="bg-gray-50 rounded-lg p-2 mb-2">
                <p className="text-xs text-gray-700 line-clamp-2">
                  {draft.content}
                </p>
              </div>

              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                Created: {new Date(draft.createdAt).toLocaleDateString()}
                {draft.sentAt && (
                  <>
                    <span className="mx-2">•</span>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Sent: {new Date(draft.sentAt).toLocaleDateString()}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 ml-4">
            {draft.status === 'draft' && (
              <>
                <Button size="sm" onClick={() => handleEdit(draft.id)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" onClick={() => handleSend(draft.id)}>
                  <Send className="w-3 h-3 mr-1" />
                  Send
                </Button>
              </>
            )}
            
            {draft.status === 'sent' && (
              <Button size="sm" variant="outline" onClick={() => handleArchive(draft.id)}>
                <Archive className="w-3 h-3 mr-1" />
                Archive
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Drafts</h1>
              <p className="text-gray-600">Manage your message drafts and outreach templates</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Drafts</p>
                      <p className="text-2xl font-bold text-gray-900">{draftStats.total}</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Draft Status</p>
                      <p className="text-2xl font-bold text-yellow-600">{draftStats.draft}</p>
                    </div>
                    <Edit className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Sent</p>
                      <p className="text-2xl font-bold text-green-600">{draftStats.sent}</p>
                    </div>
                    <Send className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Archived</p>
                      <p className="text-2xl font-bold text-gray-600">{draftStats.archived}</p>
                    </div>
                    <Archive className="w-8 h-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Actions */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Button className="flex items-center space-x-2">
                      <Plus className="w-4 h-4" />
                      <span>New Draft</span>
                    </Button>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <div className="flex-1 sm:w-80">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search drafts by contact, company, or content..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
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

                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="linkedin_message">LinkedIn Message</SelectItem>
                        <SelectItem value="linkedin_inmail">LinkedIn InMail</SelectItem>
                        <SelectItem value="gmail_intro">Gmail Introduction</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Drafts by Target Company */}
            {targetCompanies.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-6 h-6 text-orange-500" />
                  <h2 className="text-xl font-bold text-gray-900">Drafts by Target Company</h2>
                </div>

                {targetCompanies.map((company) => {
                  const companyDrafts = getDraftsByCompany(company);
                  
                  if (companyDrafts.length === 0) return null;

                  const companyStats = {
                    total: companyDrafts.length,
                    draft: companyDrafts.filter(d => d.status === 'draft').length,
                    sent: companyDrafts.filter(d => d.status === 'sent').length,
                    archived: companyDrafts.filter(d => d.status === 'archived').length
                  };

                  return (
                    <Card key={company} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Building2 className="w-6 h-6 text-blue-600" />
                            <span>{company}</span>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {companyDrafts.length} drafts
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

                          {/* Drafts for this company */}
                          <div className="space-y-3">
                            {companyDrafts.map((draft) => (
                              <DraftCard key={draft.id} draft={draft} />
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Other Companies Drafts */}
            {getOtherDrafts().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <Building2 className="w-6 h-6 text-gray-600" />
                    <span>Other Companies</span>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      {getOtherDrafts().length} drafts
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getOtherDrafts().map((draft) => (
                      <DraftCard key={draft.id} draft={draft} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Drafts Found */}
            {filteredDrafts.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No drafts found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Create your first draft to get started'
                    }
                  </p>
                  {!searchTerm && filterStatus === 'all' && filterType === 'all' && (
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Draft
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Drafts;