import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Conversation, Message, Contact } from '@/types';
import { storage } from '@/lib/storage';
import { imageService, ImageProcessingResult } from '@/services/imageService';
import { ProcessedImage } from '@/utils/imageUtils';
import {
  Send,
  Bot,
  User,
  MessageSquare,
  Calendar,
  Mail,
  Building2,
  GraduationCap,
  Users as UsersIcon,
  Star,
  ImageIcon,
  Paperclip,
  X,
  AlertTriangle
} from 'lucide-react';

interface ChatInterfaceProps {
  conversation?: Conversation;
  onNewConversation: (conversation: Conversation) => void;
}

export function ChatInterface({ conversation, onNewConversation }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(conversation?.messages || []);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [uploadedImages, setUploadedImages] = useState<ProcessedImage[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContacts(storage.getContacts());
  }, []);

  useEffect(() => {
    if (conversation) {
      setMessages(conversation.messages);
    }
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateAIResponse = (userMessage: string): Message => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Simulate AI responses based on common networking queries
    let content = '';
    let metadata = {};

    if (lowerMessage.includes('stripe') && (lowerMessage.includes('best people') || lowerMessage.includes('who'))) {
      content = `I found 3 relevant people at Stripe for product marketing roles! Here are your top targets with the strongest introduction paths:

**1. Sarah Chen, Senior Product Marketing Manager**
- Best bridge: Alex Kumar (your ex-Google colleague, 2019-2021 overlap)
- Commonality: Both worked on Google Ads team
- Confidence: 95%

**2. Mike Rodriguez, VP Product Marketing** 
- Best bridge: Priya Patel (UCLA '18 classmate, both in Marketing Club)
- Commonality: UCLA alumni connection
- Confidence: 90%

**3. Jennifer Liu, Product Marketing Lead**
- Best bridge: David Park (mutual connection through RevOps Collective)
- Commonality: RevOps community members
- Confidence: 80%

Would you like me to draft an introduction request for any of these paths?`;
      
      metadata = {
        contacts: ['contact-1', 'contact-2', 'contact-3'],
        bridges: ['bridge-1', 'bridge-2']
      };
    } else if (lowerMessage.includes('draft') && lowerMessage.includes('intro')) {
      content = `Perfect! I'll create an introduction request for Alex that highlights your shared Google experience. Here's a draft that leads with your strongest commonality:

**Subject:** Quick intro request - fellow Google Ads alum

**Message:**
Hi Alex,

Hope you're doing well! I'm reaching out because I remember you mentioning your connection to Stripe during our Google days. I'm exploring product marketing opportunities and would love a brief intro to Sarah Chen if you think it makes sense.

We both worked on the Google Ads team (you were there when I joined in 2019), so I thought you'd be a credible bridge. Happy to send more context if helpful.

Thanks for considering!
- Maya

Would you prefer to send this via LinkedIn or Gmail?`;
      
      metadata = {
        drafts: ['draft-1']
      };
    } else if (lowerMessage.includes('gmail') || lowerMessage.includes('email')) {
      content = `Great choice! I'll prepare this for Gmail. Here's what happens next:

1. **Confirm recipient**: I'll need you to confirm Alex's email address
2. **Review draft**: You can edit the message before sending
3. **Send**: Click "Send via Gmail" when ready

After Sarah responds positively, I can help you set up a 20-minute intro call with a Google Meet link. The meeting invite will reference your Google connection and product marketing focus.

Ready to proceed with the Gmail introduction?`;
    } else if (lowerMessage.includes('meeting') || lowerMessage.includes('schedule')) {
      content = `I can help you schedule a meeting! Here are the options:

**For Sarah Chen (after successful introduction):**
- 30-minute intro call
- Google Meet link included
- Suggested agenda: Product marketing role discussion

**For Alex Kumar (immediate):**
- Coffee chat to catch up
- 45-minute duration
- Discuss networking opportunities

Would you like me to set up either of these meetings?`;
    } else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      content = `I'm your AI networking assistant! Here's how I can help:

**🎯 Find the right people:**
- "Who are the best people at [Company] to connect with?"
- "Show me product marketing contacts at Stripe"

**🌉 Identify bridge paths:**
- "What's the best way to reach Sarah Chen?"
- "Who can introduce me to people at Meta?"

**✍️ Draft personalized messages:**
- "Draft an intro request via Alex for Sarah"
- "Create a LinkedIn message to Mike Rodriguez"

**📅 Schedule meetings:**
- "Book a meeting with Alex Kumar"
- "Set up intro call with Sarah Chen"

**📋 Manage follow-ups:**
- "Remind me to follow up with Priya"
- "What tasks do I have this week?"

Try asking me about specific companies or people you want to connect with!`;
    } else {
      content = `I understand you're asking about "${userMessage}". Let me help you with that!

To give you the most relevant networking recommendations, could you be more specific about:

- Which company or person you're interested in connecting with
- What type of role or opportunity you're exploring
- Whether you need help with introductions, drafting messages, or scheduling meetings

For example, you could ask:
- "Who are the best people at [Company] to connect with?"
- "Draft an introduction request for [Person]"
- "Schedule a meeting with [Contact]"

What would you like to focus on?`;
    }

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      metadata
    };
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingImages(true);
    setImageErrors([]);

    try {
      const results: ImageProcessingResult[] = [];
      
      for (const file of Array.from(files)) {
        const result = await imageService.processImage(file);
        results.push(result);
      }

      // Separate successful and failed results
      const successful = results.filter(r => r.success && r.processedImage);
      const failed = results.filter(r => !r.success);

      // Add successful images
      if (successful.length > 0) {
        const newImages = successful.map(r => r.processedImage!);
        setUploadedImages(prev => [...prev, ...newImages]);
      }

      // Show errors for failed uploads
      if (failed.length > 0) {
        const errors = failed.map(r => r.error!);
        setImageErrors(errors);
      }

      // Show warnings for resized images
      const warnings = successful
        .filter(r => r.warnings && r.warnings.length > 0)
        .flatMap(r => r.warnings!);
      
      if (warnings.length > 0) {
        console.log('Image processing warnings:', warnings);
      }

    } catch (error) {
      setImageErrors(['Failed to process images: ' + (error instanceof Error ? error.message : 'Unknown error')]);
    } finally {
      setIsProcessingImages(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const clearImageErrors = () => {
    setImageErrors([]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && uploadedImages.length === 0) return;

    // Prepare message content
    let messageContent = inputValue;
    const messageImages = [...uploadedImages];

    // Add image information to message content if images are present
    if (messageImages.length > 0) {
      const imageInfo = messageImages.map((img, index) =>
        `Image ${index + 1}: ${img.dimensions.width}×${img.dimensions.height}${img.wasResized ? ' (resized)' : ''}`
      ).join(', ');
      
      if (messageContent) {
        messageContent += `\n\n[Attached images: ${imageInfo}]`;
      } else {
        messageContent = `[Attached images: ${imageInfo}]`;
      }
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      metadata: messageImages.length > 0 ? {
        images: messageImages.map(img => ({
          dataUrl: img.dataUrl,
          dimensions: img.dimensions,
          wasResized: img.wasResized,
          originalDimensions: img.originalDimensions
        }))
      } : undefined
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setUploadedImages([]); // Clear uploaded images after sending
    setImageErrors([]); // Clear any errors
    setIsTyping(true);

    // Simulate AI thinking time with image analysis
    setTimeout(() => {
      let aiResponseContent = '';
      
      if (messageImages.length > 0) {
        aiResponseContent = `I can see you've shared ${messageImages.length} image${messageImages.length > 1 ? 's' : ''} with me. `;
        
        // Add information about image processing
        const resizedCount = messageImages.filter(img => img.wasResized).length;
        if (resizedCount > 0) {
          aiResponseContent += `${resizedCount} image${resizedCount > 1 ? 's were' : ' was'} automatically resized to meet API requirements (max 2000px). `;
        }
        
        aiResponseContent += `In a real implementation, I would analyze these images using vision AI capabilities. `;
        
        if (inputValue) {
          aiResponseContent += `Regarding your message: "${inputValue}" - I would provide context-aware responses based on both the text and image content.`;
        } else {
          aiResponseContent += `What would you like me to help you with regarding these images?`;
        }
      } else {
        aiResponseContent = generateAIResponse(inputValue).content;
      }

      const aiResponse: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: aiResponseContent,
        timestamp: new Date(),
        metadata: messageImages.length > 0 ? { hasImageAnalysis: true } : undefined
      };

      const updatedMessages = [...newMessages, aiResponse];
      setMessages(updatedMessages);
      setIsTyping(false);

      // Save conversation
      const newConversation: Conversation = {
        id: conversation?.id || `conv-${Date.now()}`,
        messages: updatedMessages,
        createdAt: conversation?.createdAt || new Date(),
        updatedAt: new Date(),
        topic: updatedMessages[0]?.content.slice(0, 50) + '...'
      };

      if (!conversation) {
        onNewConversation(newConversation);
      }
    }, 1000 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getCommonalityIcon = (type: string) => {
    switch (type) {
      case 'employer': return Building2;
      case 'education': return GraduationCap;
      case 'mutual': return UsersIcon;
      case 'event': return Calendar;
      case 'project': return Star;
      default: return UsersIcon;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Hi Maya! I'm your AI networking assistant.
            </h3>
            <p className="text-gray-600 mb-4">
              Ask me about networking opportunities, introductions, or draft personalized messages.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setInputValue("Who are the best people at Stripe to connect with?")}
              >
                Find Stripe contacts
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setInputValue("Draft an intro request via Alex for Sarah Chen")}
              >
                Draft introduction
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setInputValue("Schedule a meeting with Alex Kumar")}
              >
                Schedule meeting
              </Button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex space-x-3 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <Avatar className="w-8 h-8">
                <AvatarFallback className={message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}>
                  {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
              
              <div className={`rounded-lg p-4 ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-200'
              }`}>
                <div className="whitespace-pre-wrap text-sm">
                  {message.content}
                </div>
                
                {/* Action buttons for AI messages */}
                {message.role === 'assistant' && message.metadata && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                    {message.metadata.contacts && (
                      <Button size="sm" variant="outline" className="text-xs">
                        <UsersIcon className="w-3 h-3 mr-1" />
                        View Contacts
                      </Button>
                    )}
                    {message.metadata.drafts && (
                      <Button size="sm" variant="outline" className="text-xs">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        View Draft
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs">
                      <Mail className="w-3 h-3 mr-1" />
                      Send via Gmail
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      Schedule Meeting
                    </Button>
                  </div>
                )}
                
                <div className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex space-x-3 max-w-3xl">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gray-100">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Image Upload Errors */}
      {imageErrors.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800 mb-1">Image Upload Errors</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {imageErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearImageErrors}
                className="text-red-600 hover:text-red-800 p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Area */}
      {uploadedImages.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">
              Attached Images ({uploadedImages.length})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUploadedImages([])}
              className="text-gray-500 hover:text-gray-700"
            >
              Clear All
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {uploadedImages.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={image.dataUrl}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </Button>
                <div className="mt-1 text-xs text-gray-500 text-center">
                  {image.dimensions.width}×{image.dimensions.height}
                  {image.wasResized && (
                    <span className="block text-orange-600">Resized</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <div className="flex space-x-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              disabled={isProcessingImages}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingImages}
              className="px-2"
              title="Upload images"
            >
              {isProcessingImages ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </Button>
          </div>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about networking opportunities, introductions, or draft messages..."
            className="flex-1"
            disabled={isTyping || isProcessingImages}
          />
          <Button
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && uploadedImages.length === 0) || isTyping || isProcessingImages}
            className="px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {(uploadedImages.length > 0 || isProcessingImages) && (
          <div className="mt-2 text-xs text-gray-500">
            {isProcessingImages && "Processing images..."}
            {uploadedImages.length > 0 && !isProcessingImages &&
              `${uploadedImages.length} image${uploadedImages.length > 1 ? 's' : ''} ready to send`
            }
          </div>
        )}
      </div>
    </div>
  );
}