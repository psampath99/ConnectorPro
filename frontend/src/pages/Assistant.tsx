import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatInterface } from '@/components/assistant/ChatInterface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Conversation } from '@/types';
import { storage } from '@/lib/storage';
import { 
  Bot, 
  MessageSquare, 
  Plus, 
  Clock,
  Trash2
} from 'lucide-react';

const Assistant = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | undefined>();

  useEffect(() => {
    const savedConversations = storage.getConversations();
    setConversations(savedConversations);
    if (savedConversations.length > 0) {
      setActiveConversation(savedConversations[0]);
    }
  }, []);

  const handleNewConversation = (conversation: Conversation) => {
    const updatedConversations = [conversation, ...conversations];
    setConversations(updatedConversations);
    setActiveConversation(conversation);
    storage.setConversations(updatedConversations);
  };

  const handleStartNewChat = () => {
    setActiveConversation(undefined);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
  };

  const handleDeleteConversation = (conversationId: string) => {
    const updatedConversations = conversations.filter(c => c.id !== conversationId);
    setConversations(updatedConversations);
    storage.setConversations(updatedConversations);
    
    if (activeConversation?.id === conversationId) {
      setActiveConversation(updatedConversations[0]);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex">
        {/* Conversation History */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">AI Assistant</h2>
              <Button size="sm" onClick={handleStartNewChat}>
                <Plus className="w-4 h-4 mr-1" />
                New Chat
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Ask strategic networking questions and get personalized recommendations.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {conversations.length > 0 ? (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      activeConversation?.id === conversation.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conversation.topic || 'New conversation'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {conversation.messages.length} messages
                        </p>
                        <div className="flex items-center text-xs text-gray-400 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(conversation.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conversation.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No conversations yet</p>
                <p className="text-xs text-gray-500">Start a new chat to get networking help</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col">
          {activeConversation || conversations.length === 0 ? (
            <ChatInterface
              conversation={activeConversation}
              onNewConversation={handleNewConversation}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Card className="w-96">
                <CardHeader className="text-center">
                  <Bot className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <CardTitle>AI Networking Assistant</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <p className="text-gray-600">
                    Get personalized networking recommendations and draft messages with AI assistance.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="secondary" className="mr-2">Bridge Mapping</Badge>
                    <Badge variant="secondary" className="mr-2">Message Drafting</Badge>
                    <Badge variant="secondary">Meeting Scheduling</Badge>
                  </div>
                  <Button onClick={handleStartNewChat} className="w-full">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Start New Conversation
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Assistant;