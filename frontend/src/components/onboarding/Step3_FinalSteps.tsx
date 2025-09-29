import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Building2, Settings, Users, Calendar, ChevronUp, ChevronDown } from 'lucide-react';

interface Step3FinalStepsProps {
  onComplete: () => void;
  onBack: () => void;
}

const commonalityItems = {
  employer: { label: 'Shared Employer', icon: Building2 },
  education: { label: 'Same School/University', icon: Settings },
  mutual: { label: 'Mutual Connections', icon: Users },
  event: { label: 'Same Events/Communities', icon: Calendar }
};

const commonCompanies = [
  'Google', 'Meta', 'Apple', 'Microsoft', 'Amazon', 'Netflix', 'Tesla', 'Stripe',
  'Airbnb', 'Uber', 'LinkedIn', 'Salesforce', 'Adobe', 'Zoom', 'Slack', 'Figma',
  'Notion', 'Spotify', 'Twitter', 'TikTok', 'Snapchat', 'Pinterest', 'Dropbox', 'Square'
];

export function Step3_FinalSteps({ onComplete, onBack }: Step3FinalStepsProps) {
  const [draftTone, setDraftTone] = useState<'professional' | 'friendly' | 'concise'>('professional');
  const [commonalityOrder, setCommonalityOrder] = useState<('employer' | 'education' | 'mutual' | 'event')[]>([
    'employer', 'education', 'mutual', 'event'
  ]);
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);

  const moveCommonalityUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...commonalityOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setCommonalityOrder(newOrder);
    }
  };

  const moveCommonalityDown = (index: number) => {
    if (index < commonalityOrder.length - 1) {
      const newOrder = [...commonalityOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setCommonalityOrder(newOrder);
    }
  };

  const handleCompanyToggle = (company: string) => {
    setTargetCompanies(prev =>
      prev.includes(company)
        ? prev.filter(c => c !== company)
        : [...prev, company]
    );
  };

  const handleAddCustomCompany = (company: string) => {
    if (company.trim() && !targetCompanies.includes(company.trim())) {
      setTargetCompanies(prev => [...prev, company.trim()]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Final Steps</h3>
        <p className="text-gray-600">Complete your profile and customize your preferences</p>
      </div>

      {/* Target Companies Section - Moved from Step 1 */}
      <div className="space-y-4">
        <div>
          <h4 className="text-lg font-semibold mb-2">Target Companies</h4>
          <p className="text-gray-600 text-sm mb-2">Optional: Select companies you'd like to connect with people at.</p>
          <p className="text-gray-500 text-xs">You can skip this step and add companies later in your dashboard.</p>
        </div>

        <div className="space-y-4">
          {/* Popular Companies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Popular Companies
            </label>
            <div className="flex flex-wrap gap-2">
              {commonCompanies.map((company) => (
                <Badge
                  key={company}
                  variant={targetCompanies.includes(company) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-blue-100"
                  onClick={() => handleCompanyToggle(company)}
                >
                  {company}
                  {targetCompanies.includes(company) && (
                    <CheckCircle className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Add Custom Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Custom Company
            </label>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter company name"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCustomCompany((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={(e) => {
                  const input = (e.target as HTMLElement).parentElement?.querySelector('input');
                  if (input) {
                    handleAddCustomCompany(input.value);
                    input.value = '';
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Selected Companies */}
          {targetCompanies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Companies ({targetCompanies.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {targetCompanies.map((company) => (
                  <Badge
                    key={company}
                    variant="default"
                    className="cursor-pointer bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleCompanyToggle(company)}
                  >
                    {company}
                    <span className="ml-1 text-xs">×</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Tone Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message Tone
        </label>
        <Select value={draftTone} onValueChange={(value: any) => setDraftTone(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="professional">Professional - Formal and business-focused</SelectItem>
            <SelectItem value="friendly">Friendly - Warm and approachable</SelectItem>
            <SelectItem value="concise">Concise - Brief and to the point</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Commonality Priority Order */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Commonality Priority Order
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Drag to reorder how we prioritize shared connections when suggesting introductions
        </p>
        <div className="space-y-2">
          {commonalityOrder.map((commonalityKey, index) => {
            const item = commonalityItems[commonalityKey];
            return (
              <div key={commonalityKey} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                <span className="text-sm font-medium text-gray-600 w-6">#{index + 1}</span>
                <item.icon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveCommonalityUp(index)}
                    disabled={index === 0}
                    className="p-1 h-8 w-8"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveCommonalityDown(index)}
                    disabled={index === commonalityOrder.length - 1}
                    className="p-1 h-8 w-8"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Higher priority commonalities will be emphasized more in AI-generated messages
        </p>
      </div>

      {/* Completion Message */}
      <div className="bg-green-50 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-2">You're all set! 🎉</h4>
        <p className="text-sm text-green-800">
          ConnectorPro will help you find the best networking opportunities at your target companies 
          and draft personalized messages that highlight your strongest commonalities.
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={onComplete}
          className="bg-green-600 hover:bg-green-700"
        >
          Complete Setup
        </Button>
      </div>
    </div>
  );
}