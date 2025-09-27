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
import { storage } from '@/lib/storage';
import { Task, Contact } from '@/types';
import { 
  CheckSquare, 
  Search,
  Plus,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building2,
  Target,
  Lightbulb,
  Settings
} from 'lucide-react';

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterTargetCompany, setFilterTargetCompany] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<string>('7');
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);

  useEffect(() => {
    const loadedTasks = storage.getTasks();
    const loadedContacts = storage.getContacts();
    
    setTasks(loadedTasks);
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

  // Get tasks by company with statistics
  const getTasksByCompanyStats = () => {
    // Get all companies from tasks
    const allCompanies = new Set<string>();
    
    tasks.forEach(task => {
      if (task.contactId) {
        const contact = contacts.find(c => c.id === task.contactId);
        if (contact?.company) {
          allCompanies.add(contact.company);
        }
      }
    });

    // Calculate stats for each company
    const companyStats = Array.from(allCompanies).map(company => {
      const companyTasks = tasks.filter(task => {
        if (!task.contactId) return false;
        const contact = contacts.find(c => c.id === task.contactId);
        return contact?.company === company;
      });

      const pending = companyTasks.filter(t => t.status === 'pending').length;
      const completed = companyTasks.filter(t => t.status === 'completed').length;
      const overdue = companyTasks.filter(t => t.status === 'overdue').length;
      const total = companyTasks.length;

      return {
        company,
        pending,
        completed,
        overdue,
        total,
        isTargetCompany: targetCompanies.includes(company)
      };
    });

    // Sort by target companies first, then by total tasks
    return companyStats.sort((a, b) => {
      if (a.isTargetCompany && !b.isTargetCompany) return -1;
      if (!a.isTargetCompany && b.isTargetCompany) return 1;
      return b.total - a.total;
    });
  };

  const getFilteredTasks = () => {
    let filtered = tasks;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    // Filter by company
    if (filterTargetCompany !== 'all') {
      filtered = filtered.filter(task => {
        if (!task.contactId) return filterTargetCompany === 'other';
        
        const contact = contacts.find(c => c.id === task.contactId);
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
      filtered = filtered.filter(task => {
        const contact = task.contactId 
          ? contacts.find(c => c.id === task.contactId)
          : null;
        const contactName = contact?.name || '';
        const contactCompany = contact?.company || '';
        
        return task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
               task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               contactCompany.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    return filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  };

  const filteredTasks = getFilteredTasks();

  // Group tasks by target companies
  const getTasksByCompany = (company: string) => {
    return tasks.filter(task => {
      if (!task.contactId) return false;
      const contact = contacts.find(c => c.id === task.contactId);
      return contact?.company === company;
    });
  };

  const getOtherTasks = () => {
    return tasks.filter(task => {
      if (!task.contactId) return true;
      const contact = contacts.find(c => c.id === task.contactId);
      const company = contact?.company || '';
      return !targetCompanies.includes(company);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'completed': return CheckCircle;
      case 'overdue': return AlertCircle;
      default: return CheckSquare;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleEdit = (taskId: string) => {
    console.log('Edit task:', taskId);
  };

  const handleComplete = (taskId: string) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { ...task, status: 'completed' as const, completedAt: new Date() }
        : task
    );
    setTasks(updatedTasks);
    storage.setTasks(updatedTasks);
  };

  const handleDelete = (taskId: string) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);
    storage.setTasks(updatedTasks);
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

  const isOverdue = (dueDate: Date | string) => {
    try {
      const dateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
      if (isNaN(dateObj.getTime())) return false;
      return new Date() > dateObj;
    } catch (error) {
      return false;
    }
  };

  const companyStats = getTasksByCompanyStats();

  const TaskCard = ({ task }: { task: Task }) => {
    const contact = task.contactId 
      ? contacts.find(c => c.id === task.contactId)
      : null;
    const StatusIcon = getStatusIcon(task.status);
    const dueDate = new Date(task.dueDate);

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                <CheckSquare className="w-5 h-5 text-orange-600" />
              </div>
              <Badge className={getStatusColor(task.status)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {task.status}
              </Badge>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="font-medium text-gray-900">{task.title}</h4>
                <Badge variant="outline" className={getPriorityColor(task.priority)}>
                  {task.priority} priority
                </Badge>
                {isOverdue(task.dueDate) && task.status === 'pending' && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Overdue
                  </Badge>
                )}
              </div>
              
              {/* Related Contact */}
              {contact && (
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">Related to:</span>
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className="bg-gray-100 text-xs">
                      {contact.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-700">{contact.name}</span>
                  <span className="text-sm text-gray-500">at {contact.company}</span>
                </div>
              )}

              {/* Description */}
              {task.description && (
                <div className="bg-gray-50 rounded-lg p-2 mb-2">
                  <p className="text-xs text-gray-700">{task.description}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Due: {formatDateTime(task.dueDate)}
                </div>
                <div className="flex items-center">
                  Created: {formatDateTime(task.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 ml-4">
            {task.status === 'pending' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleEdit(task.id)}
                  className="text-orange-600 border-orange-200"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleComplete(task.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-3 h-3" />
                </Button>
              </>
            )}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => handleDelete(task.id)}
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
                <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
                <p className="text-gray-600">Manage your tasks and to-dos</p>
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
                  <span>Tasks by Company</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Company</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Pending</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Completed</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Overdue</th>
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
                                <div className="absolute inset-0 w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center text-orange-600 font-semibold text-sm">
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
                            <div className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                              <span className="text-sm font-bold text-yellow-900">{stat.pending}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                              <span className="text-sm font-bold text-green-900">{stat.completed}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="inline-flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">
                              <span className="text-sm font-bold text-red-900">{stat.overdue}</span>
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
                  {/* Top Row: Create Task Button + Search */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <Button className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700">
                      <Plus className="w-4 h-4" />
                      <span>Create Task</span>
                    </Button>

                    {/* Search Bar */}
                    <div className="w-full sm:w-80">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search tasks by title, description, or contact..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Filter Dropdowns - Status, Priority, Company */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="low">Low Priority</SelectItem>
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
                              <Target className="w-3 h-3 mr-2 text-orange-600" />
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

            {/* Tasks by Target Company */}
            {targetCompanies.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-6 h-6 text-amber-500" />
                  <h2 className="text-xl font-bold text-gray-900">Tasks by Target Company</h2>
                </div>

                {targetCompanies.map((company) => {
                  const companyTasks = getTasksByCompany(company);
                  
                  const companyStats = {
                    total: companyTasks.length,
                    pending: companyTasks.filter(t => t.status === 'pending').length,
                    completed: companyTasks.filter(t => t.status === 'completed').length,
                    overdue: companyTasks.filter(t => t.status === 'overdue').length
                  };

                  return (
                    <Card key={company} className="border-l-4 border-l-orange-500">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Building2 className="w-6 h-6 text-orange-600" />
                            <span>{company}</span>
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              {companyTasks.length} tasks
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
                          <div className="grid grid-cols-4 gap-4 p-4 bg-orange-50 rounded-lg">
                            <div className="text-center">
                              <p className="text-lg font-bold text-orange-900">{companyStats.total}</p>
                              <p className="text-xs text-orange-700">Total</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-yellow-600">{companyStats.pending}</p>
                              <p className="text-xs text-orange-700">Pending</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-600">{companyStats.completed}</p>
                              <p className="text-xs text-orange-700">Completed</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-red-600">{companyStats.overdue}</p>
                              <p className="text-xs text-orange-700">Overdue</p>
                            </div>
                          </div>

                          {/* Tasks for this company */}
                          {companyTasks.length > 0 ? (
                            <div className="space-y-3">
                              {companyTasks.map((task) => (
                                <TaskCard key={task.id} task={task} />
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <CheckSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm">No tasks for {company} yet</p>
                              <p className="text-xs">Create your first task to get started</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Other Companies Tasks */}
            {getOtherTasks().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <Building2 className="w-6 h-6 text-gray-600" />
                    <span>Other Companies</span>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      {getOtherTasks().length} tasks
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getOtherTasks().map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Tasks Found */}
            {filteredTasks.length === 0 && tasks.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No tasks found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Create your first task to get started
                  </p>
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      
    </div>
  );
};

export default Tasks;