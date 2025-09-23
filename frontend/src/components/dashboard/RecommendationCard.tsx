import { Contact, Recommendation, Commonality } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Mail, 
  Calendar, 
  Building2, 
  GraduationCap, 
  Users, 
  Calendar as CalendarIcon,
  Star
} from 'lucide-react';

interface RecommendationCardProps {
  recommendation: Recommendation;
  contact: Contact;
  onConnect: (contactId: string) => void;
  onScheduleMeeting: (contactId: string) => void;
  onDismiss: (recommendationId: string) => void;
}

const commonalityIcons = {
  employer: Building2,
  education: GraduationCap,
  mutual: Users,
  event: CalendarIcon,
  project: Star
};

const commonalityColors = {
  employer: 'bg-blue-100 text-blue-800',
  education: 'bg-green-100 text-green-800',
  mutual: 'bg-purple-100 text-purple-800',
  event: 'bg-orange-100 text-orange-800',
  project: 'bg-pink-100 text-pink-800'
};

export function RecommendationCard({ 
  recommendation, 
  contact, 
  onConnect, 
  onScheduleMeeting, 
  onDismiss 
}: RecommendationCardProps) {
  const CommonalityIcon = commonalityIcons[recommendation.commonality.type];
  const confidencePercentage = Math.round(recommendation.confidence * 100);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback className="bg-gray-100">
                {contact.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-gray-900">{contact.name}</h3>
              <p className="text-sm text-gray-600">{contact.title}</p>
              <p className="text-sm text-gray-500">{contact.company}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {confidencePercentage}% match
            </Badge>
            <Badge 
              variant="secondary" 
              className={`text-xs ${commonalityColors[recommendation.commonality.type]}`}
            >
              <CommonalityIcon className="w-3 h-3 mr-1" />
              {recommendation.commonality.type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Commonality Details */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <CommonalityIcon className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">
              {recommendation.commonality.description}
            </span>
          </div>
          <p className="text-xs text-gray-600">
            {recommendation.commonality.evidence}
          </p>
        </div>

        {/* Reasoning */}
        <div>
          <p className="text-sm text-gray-700">{recommendation.reasoning}</p>
        </div>

        {/* Suggested Action */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm font-medium text-blue-900 mb-1">Suggested Action:</p>
          <p className="text-sm text-blue-800">{recommendation.suggestedAction}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              onClick={() => onConnect(contact.id)}
              className="flex items-center space-x-1"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Connect</span>
            </Button>
            
            {contact.degree === 1 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onScheduleMeeting(contact.id)}
                className="flex items-center space-x-1"
              >
                <Calendar className="w-4 h-4" />
                <span>Meet</span>
              </Button>
            )}
          </div>
          
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => onDismiss(recommendation.id)}
            className="text-gray-500 hover:text-gray-700"
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}