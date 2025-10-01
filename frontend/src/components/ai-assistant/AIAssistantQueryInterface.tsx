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

interface AIAssistantQuery {
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

interface AIAssistantQueryInterfaceProps {
  className?: string;
}

export function AIAssistantQueryInterface({ className }: AIAssistantQueryInterfaceProps) {
  const [queries, setQueries] = useState<AIAssistantQuery[]>([]);
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

  // RAG-based backend now returns data directly from CSV, so we can use it as-is.
  // The transformLLMData function is now simplified to pass data through.
  const transformLLMData = (data: any, queryType: string): any => {
    // The new RAG backend returns data in a direct format (e.g., list of dicts).
    // We no longer need complex transformations. We'll pass the data directly
    // and handle rendering dynamically in the `renderResponse` function.
    console.log("RAG-based data received for query type:", queryType, data);
    return data;
  };

  const handleSendQuery = async () => {
    if (!inputValue.trim() || isProcessing) return;
    
    setIsProcessing(true);
    const queryText = inputValue.trim();
    setInputValue('');
    
    // Process query using LLM-powered backend
    const response = await processQueryWithLLM(queryText);
    
    // Create query record
    const newQuery: AIAssistantQuery = {
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
    // Handle table visualization
    if (response.visualType === 'table' && Array.isArray(response.data) && response.data.length > 0) {
      const headers = Object.keys(response.data[0]); // Get keys from first item
      return (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">{response.title}</h4>
          </div>
          <p className="text-sm text-gray-600">{response.summary}</p>
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {response.data.map((row: any, rowIndex: number) => (
                <TableRow key={rowIndex}>
                  {headers.map(header => <TableCell key={header}>{row[header]}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }
    
    // Handle cards visualization (for contacts)
    if (response.visualType === 'cards' && Array.isArray(response.data) && response.data.length > 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">{response.title}</h4>
          </div>
          <p className="text-sm text-gray-600">{response.summary}</p>
          <div className="grid gap-3 max-h-96 overflow-y-auto">
            {response.data.slice(0, 20).map((contact: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{contact.Name}</h5>
                    {contact.Title && <p className="text-sm text-gray-600">{contact.Title}</p>}
                    {contact.Company && <p className="text-sm text-blue-600">{contact.Company}</p>}
                  </div>
                  {contact.LinkedIn && (
                    <a
                      href={contact.LinkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>
            ))}
            {response.data.length > 20 && (
              <p className="text-sm text-gray-500 text-center">
                Showing first 20 of {response.data.length} contacts
              </p>
            )}
          </div>
        </div>
      );
    }
    
    // Handle text responses
    if (response.visualType === 'text' || response.type === 'analytics') {
      return (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">{response.title}</h4>
          </div>
          <p className="text-sm text-gray-600">{response.summary}</p>
          {response.data && typeof response.data === 'object' && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(response.data).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{value as string}</div>
                    <div className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    
    // Fallback for any other cases
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-900">{response.title}</h4>
        <p className="text-gray-600">{response.summary || 'No data to display.'}</p>
        {response.data && (
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(response.data, null, 2)}
          </pre>
        )}
      </div>
    );
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
          <span>Ask Your AI Assistant</span>
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
              placeholder="Ask your AI Assistant... (e.g., 'Show me top 10 companies')"
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