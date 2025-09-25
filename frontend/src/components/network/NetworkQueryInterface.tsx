import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Send,
  Bot,
  User,
  Building2,
  Users,
  TrendingUp,
  BarChart3,
  Loader2,
  MessageSquare,
  Search,
  Filter
} from 'lucide-react';

interface NetworkQuery {
  id: string;
  query: string;
  timestamp: Date;
  response: QueryResponse;
}

interface QueryResponse {
  type: 'company_ranking' | 'contact_list' | 'company_contacts' | 'analytics' | 'error';
  data: any;
  visualType: 'chart' | 'table' | 'cards' | 'text';
  title: string;
  summary: string;
}

interface CompanyRanking {
  company: string;
  contactCount: number;
  isTargetCompany: boolean;
}

interface ContactInfo {
  name: string;
  title: string;
  company: string;
  degree: number;
  linkedinUrl?: string;
}

interface NetworkQueryInterfaceProps {
  className?: string;
}

export function NetworkQueryInterface({ className }: NetworkQueryInterfaceProps) {
  const [queries, setQueries] = useState<NetworkQuery[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [queries]);

  // Process query using LLM-powered backend
  const processQueryWithLLM = async (query: string): Promise<QueryResponse> => {
    const authToken = localStorage.getItem('accessToken') || 'demo-token';
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/network/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: query,
          conversation_history: queries.slice(-5).map(q => ({
            role: 'user',
            content: q.query
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error_message || 'Query processing failed');
      }
      
      // Transform the LLM response to match our QueryResponse interface
      return {
        type: data.query_type as 'company_ranking' | 'contact_list' | 'company_contacts' | 'analytics' | 'error',
        data: transformLLMData(data.data, data.query_type),
        visualType: data.visualization_type as 'chart' | 'table' | 'cards' | 'text',
        title: data.title,
        summary: data.summary
      };
      
    } catch (error) {
      console.error('LLM query processing error:', error);
      
      // Fallback to basic error response
      return {
        type: 'error',
        data: null,
        visualType: 'text',
        title: 'Query Processing Error',
        summary: `Failed to process your query: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or rephrase your question.`
      };
    }
  };

  // Transform LLM response data to match frontend expectations
  const transformLLMData = (data: any, queryType: string): any => {
    if (!data) return null;
    
    switch (queryType) {
      case 'company_ranking':
        // Transform grouped company data to ranking format
        if (typeof data === 'object' && !Array.isArray(data)) {
          return Object.entries(data).map(([company, contacts]: [string, any]) => ({
            company,
            contactCount: Array.isArray(contacts) ? contacts.length : (contacts?.length || 0),
            isTargetCompany: false // Could be enhanced with target company info
          })).sort((a, b) => b.contactCount - a.contactCount);
        }
        return data;
        
      case 'company_contacts':
      case 'contact_list':
        // Transform contact data to expected format
        if (typeof data === 'object' && !Array.isArray(data)) {
          // If it's grouped by company, flatten to contact list
          const allContacts: ContactInfo[] = [];
          Object.values(data).forEach((contacts: any) => {
            if (Array.isArray(contacts)) {
              contacts.forEach((contact: any) => {
                allContacts.push({
                  name: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
                  title: contact.title || 'No title',
                  company: contact.company || '',
                  degree: contact.degree || 1,
                  linkedinUrl: contact.linkedinUrl || contact.linkedin_url
                });
              });
            }
          });
          return allContacts;
        }
        return data;
        
      default:
        return data;
    }
  };

  const handleSendQuery = async () => {
    if (!inputValue.trim() || isProcessing) return;
    
    setIsProcessing(true);
    const queryText = inputValue.trim();
    setInputValue('');
    
    // Process query using LLM-powered backend
    const response = await processQueryWithLLM(queryText);
    
    // Create query record
    const newQuery: NetworkQuery = {
      id: `query-${Date.now()}`,
      query: queryText,
      timestamp: new Date(),
      response
    };
    
    setQueries(prev => [...prev, newQuery]);
    setIsProcessing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  };

  const renderResponse = (response: QueryResponse) => {
    switch (response.visualType) {
      case 'table':
        if (response.type === 'company_ranking') {
          const companies = response.data as CompanyRanking[];
          return (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">{response.title}</h4>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company, index) => (
                    <TableRow key={company.company}>
                      <TableCell className="font-medium">#{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <span>{company.company}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {company.contactCount} contacts
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {company.isTargetCompany ? (
                          <Badge variant="default">Target</Badge>
                        ) : (
                          <Badge variant="outline">Regular</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        }
        break;
        
      case 'cards':
        if (response.type === 'contact_list') {
          const contacts = response.data as ContactInfo[];
          return (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-gray-900">{response.title}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contacts.map((contact, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{contact.name}</h5>
                          <p className="text-sm text-gray-600 mt-1">{contact.title}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{contact.company}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge variant={contact.degree === 1 ? 'default' : 'secondary'} className="text-xs">
                            {contact.degree}° connection
                          </Badge>
                          {contact.linkedinUrl && (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              LinkedIn
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        }
        break;
        
      case 'text':
      default:
        return (
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900">{response.title}</h4>
            <p className="text-gray-600">{response.summary}</p>
          </div>
        );
    }
  };

  const suggestedQueries = [
    "Show me the top 10 companies",
    "Tell me the top companies that I have contacts in Fin-Tech",
    "Which companies have the most contacts?",
    "Show me contacts at Google",
    "What are my strongest connections?"
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <span>Ask About Your Network</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Ask natural language questions about your contacts and get visual insights
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Query History */}
        <div className="max-h-96 overflow-y-auto space-y-4">
          {queries.length === 0 && (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Ask me about your network
              </h3>
              <p className="text-gray-600 mb-4">
                Try asking questions like:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedQueries.slice(0, 3).map((query, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setInputValue(query)}
                    className="text-xs"
                  >
                    {query}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {queries.map((query) => (
            <div key={query.id} className="space-y-3">
              {/* User Query */}
              <div className="flex justify-end">
                <div className="flex space-x-3 max-w-2xl">
                  <div className="bg-blue-600 text-white rounded-lg p-3 text-sm">
                    {query.query}
                  </div>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-100">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              
              {/* AI Response */}
              <div className="flex justify-start">
                <div className="flex space-x-3 max-w-4xl w-full">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gray-100">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 flex-1">
                    {renderResponse(query.response)}
                    <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">
                      {query.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="flex space-x-3 max-w-3xl">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gray-100">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-600">Analyzing your network...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <div className="border-t pt-4">
          <div className="flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your network... (e.g., 'Show me top 10 companies')"
              className="flex-1"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSendQuery}
              disabled={!inputValue.trim() || isProcessing}
              className="px-4"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {/* Suggested Queries */}
          {queries.length === 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Try these examples:</p>
              <div className="flex flex-wrap gap-1">
                {suggestedQueries.map((query, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => setInputValue(query)}
                    className="text-xs h-6 px-2 text-gray-600 hover:text-gray-900"
                  >
                    "{query}"
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}