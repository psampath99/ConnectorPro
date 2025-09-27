import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from '@/types';
import {
  Network,
  Briefcase,
  TrendingUp,
  Users,
  Target,
  Search,
  Handshake,
  Globe,
  CheckCircle,
  ChevronDown,
  X
} from 'lucide-react';

interface SingleScreenOnboardingData {
  persona: User['role'] | '';
  firstName: string;
  lastName: string;
  email: string;
  linkedinProfileUrl: string;
  networkingGoals: string[];
  targetCompanies: string[];
}

interface SingleScreenOnboardingProps {
  onComplete: (data: SingleScreenOnboardingData) => void;
  onCancel?: () => void;
}

const personas = [
  {
    id: 'job_seeker' as const,
    title: 'Job Seeker',
    description: 'Looking for new career opportunities and need to connect with insiders at target companies',
    icon: Briefcase,
    goals: ['Find warm introductions to hiring managers', 'Get referrals and insider insights', 'Schedule informational interviews']
  },
  {
    id: 'consultant' as const,
    title: 'Solo Consultant',
    description: 'Building a consulting practice and need to revive relationships for referrals',
    icon: TrendingUp,
    goals: ['Reconnect with past clients', 'Generate referrals and repeat business', 'Expand professional network']
  },
  {
    id: 'community_manager' as const,
    title: 'Community Manager',
    description: 'Managing events and communities, need to facilitate valuable connections',
    icon: Users,
    goals: ['Connect event attendees', 'Manage sponsor relationships', 'Build community engagement']
  },
  {
    id: 'sales_rep' as const,
    title: 'Sales Representative',
    description: 'Need warm introductions to prospects and decision-makers',
    icon: Target,
    goals: ['Get warm introductions to prospects', 'Leverage existing relationships', 'Increase deal win rates']
  }
];

const goalsByPersona = {
  job_seeker: [
    {
      id: 'research_referrals',
      title: 'Research Companies & Build Referral Network',
      description: 'Learn about target companies while building relationships for referrals',
      icon: Search,
      strategy: 'Casual outreach to employees at all levels'
    },
    {
      id: 'hiring_decision_makers',
      title: 'Connect with Hiring Decision-Makers',
      description: 'Get formal introductions to hiring managers and team leads',
      icon: Target,
      strategy: 'Credible bridge paths to decision-makers'
    },
    {
      id: 'expand_network',
      title: 'Expand Long-Term Professional Network',
      description: 'Build strategic relationships for future career opportunities',
      icon: Globe,
      strategy: 'Industry-wide networking across companies'
    }
  ],
  consultant: [
    {
      id: 'revive_relationships',
      title: 'Revive Past Client Relationships',
      description: 'Reconnect with former clients and colleagues for referrals',
      icon: Handshake,
      strategy: 'Warm follow-ups with existing connections'
    },
    {
      id: 'generate_referrals',
      title: 'Generate New Business Referrals',
      description: 'Build relationships that lead to consulting opportunities',
      icon: TrendingUp,
      strategy: 'Strategic networking for business development'
    },
    {
      id: 'expand_network',
      title: 'Expand Professional Network',
      description: 'Build long-term relationships in your industry',
      icon: Globe,
      strategy: 'Industry-focused relationship building'
    }
  ],
  community_manager: [
    {
      id: 'event_networking',
      title: 'Facilitate Event Networking',
      description: 'Connect attendees and create valuable introductions',
      icon: Users,
      strategy: 'Community-focused relationship facilitation'
    },
    {
      id: 'sponsor_relationships',
      title: 'Manage Sponsor Relationships',
      description: 'Build and maintain partnerships with event sponsors',
      icon: Handshake,
      strategy: 'Partnership-focused networking'
    },
    {
      id: 'community_growth',
      title: 'Grow Community Engagement',
      description: 'Expand community reach and member connections',
      icon: Globe,
      strategy: 'Growth-focused community building'
    }
  ],
  sales_rep: [
    {
      id: 'warm_introductions',
      title: 'Get Warm Introductions to Prospects',
      description: 'Leverage network for introductions to potential customers',
      icon: Target,
      strategy: 'Bridge paths to decision-makers'
    },
    {
      id: 'leverage_relationships',
      title: 'Leverage Existing Relationships',
      description: 'Turn current connections into sales opportunities',
      icon: Handshake,
      strategy: 'Relationship-to-revenue conversion'
    },
    {
      id: 'expand_network',
      title: 'Expand Sales Network',
      description: 'Build relationships for future sales opportunities',
      icon: Globe,
      strategy: 'Strategic sales networking'
    }
  ]
};

const commonCompanies = [
  'Google', 'Meta', 'Apple', 'Microsoft', 'Amazon', 'Netflix', 'Tesla', 'Stripe',
  'Airbnb', 'Uber', 'LinkedIn', 'Salesforce', 'Adobe', 'Zoom', 'Slack', 'Figma',
  'Notion', 'Spotify', 'Twitter', 'TikTok', 'Snapchat', 'Pinterest', 'Dropbox', 'Square'
];

export function SingleScreenOnboarding({ onComplete, onCancel }: SingleScreenOnboardingProps) {
  const [data, setData] = useState<SingleScreenOnboardingData>({
    persona: '',
    firstName: '',
    lastName: '',
    email: '',
    linkedinProfileUrl: '',
    networkingGoals: [],
    targetCompanies: []
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Check for stored user data and pre-fill fields
  useEffect(() => {
    const storedData = localStorage.getItem('connectorpro_user_data');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        setData(prev => ({
          ...prev,
          firstName: parsed.firstName || prev.firstName,
          lastName: parsed.lastName || prev.lastName,
          email: parsed.email || prev.email,
          linkedinProfileUrl: parsed.linkedinProfileUrl || prev.linkedinProfileUrl,
        }));
      } catch (error) {
        console.log('No stored user data found');
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (dropdownOpen && !target.closest('.multi-select-dropdown')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handlePersonaSelect = (persona: User['role']) => {
    setData(prev => ({ ...prev, persona, networkingGoals: [] })); // Reset goals when persona changes
    setDropdownOpen(false); // Close dropdown when persona changes
  };

  const handleNetworkingGoalToggle = (goalId: string) => {
    setData(prev => ({
      ...prev,
      networkingGoals: prev.networkingGoals.includes(goalId)
        ? prev.networkingGoals.filter(g => g !== goalId)
        : [...prev.networkingGoals, goalId]
    }));
    // Don't close dropdown to allow multiple selections
  };


  const handleCompanyToggle = (company: string) => {
    setData(prev => ({
      ...prev,
      targetCompanies: prev.targetCompanies.includes(company)
        ? prev.targetCompanies.filter(c => c !== company)
        : [...prev.targetCompanies, company]
    }));
  };

  const handleAddCustomCompany = (company: string) => {
    if (company.trim() && !data.targetCompanies.includes(company.trim())) {
      setData(prev => ({
        ...prev,
        targetCompanies: [...prev.targetCompanies, company.trim()]
      }));
    }
  };

  const handleSubmit = () => {
    // Ensure all required fields are filled before submitting
    if (!canProceed()) {
      console.error('Cannot proceed: Required fields are missing');
      return;
    }
    
    console.log('Submitting onboarding data:', data);
    onComplete(data);
  };

  const canProceed = () => {
    return (
      data.persona !== '' &&
      data.networkingGoals.length > 0 &&
      data.firstName.trim() !== '' &&
      data.lastName.trim() !== '' &&
      data.email.trim() !== '' &&
      data.linkedinProfileUrl.trim() !== ''
      // Target companies are now optional
    );
  };

  const selectedPersona = personas.find(p => p.id === data.persona);
  const availableGoals = data.persona ? goalsByPersona[data.persona] : [];

  // Generate dynamic LinkedIn placeholder
  const generateLinkedInPlaceholder = () => {
    if (data.firstName && data.lastName) {
      const firstName = data.firstName.toLowerCase().replace(/\s+/g, '');
      const lastName = data.lastName.toLowerCase().replace(/\s+/g, '');
      return `https://www.linkedin.com/in/${firstName}${lastName}`;
    }
    return 'https://www.linkedin.com/in/your-profile';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Network className="w-7 h-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to ConnectorPro</CardTitle>
          <p className="text-gray-600">Your AI-powered LinkedIn assistant to unlock the warmest paths to opportunity.</p>
        </CardHeader>

        <CardContent className="space-y-12">
          {/* Step 1: Persona Selection - Now at the top */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">What describes you best?</h3>
              <p className="text-gray-600 text-sm mb-4">Choose the role that best matches your networking needs</p>
              
              <Select value={data.persona} onValueChange={handlePersonaSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your persona" />
                </SelectTrigger>
                <SelectContent>
                  {personas.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      <div className="flex items-center space-x-2">
                        <persona.icon className="w-4 h-4" />
                        <span>{persona.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
            </div>

          </div>

          {/* Step 2: Networking Goals - Multi-select dropdown */}
          {data.persona && availableGoals.length > 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">What are your networking goals?</h3>
                <p className="text-gray-600 text-sm mb-4">Select all goals that match your current focus (you can pick multiple)</p>
              </div>

              {/* Multi-select Dropdown with inline tags */}
              <div className="relative multi-select-dropdown">
                <div
                  className="flex h-auto min-h-[2.5rem] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer hover:border-gray-300 transition-colors"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <div className="flex-1 flex flex-wrap gap-1 items-center">
                    {data.networkingGoals.length === 0 ? (
                      <span className="text-muted-foreground">Select your goals</span>
                    ) : (
                      data.networkingGoals.map((goalId) => {
                        const goal = availableGoals.find(g => g.id === goalId);
                        return goal ? (
                          <div
                            key={goalId}
                            className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full border border-blue-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNetworkingGoalToggle(goalId);
                            }}
                          >
                            <goal.icon className="w-3 h-3" />
                            <span>{goal.title}</span>
                            <X className="w-3 h-3 hover:bg-blue-200 rounded-full cursor-pointer" />
                          </div>
                        ) : null;
                      })
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 opacity-50 transition-transform flex-shrink-0 ml-2 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Dropdown Content */}
                {dropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-96 overflow-hidden">
                    <div className="p-1">
                      {availableGoals.map((goal) => (
                        <div
                          key={goal.id}
                          onClick={() => handleNetworkingGoalToggle(goal.id)}
                          className={`relative flex w-full cursor-pointer select-none items-start rounded-sm p-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${
                            data.networkingGoals.includes(goal.id) ? 'bg-accent' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3 w-full">
                            <goal.icon className={`w-5 h-5 mt-0.5 ${
                              data.networkingGoals.includes(goal.id) ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{goal.title}</div>
                              <div className="text-xs text-gray-600 mt-1">{goal.description}</div>
                              <div className="text-xs text-gray-500 mt-1 italic">{goal.strategy}</div>
                            </div>
                            {data.networkingGoals.includes(goal.id) && (
                              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Basic Information - Now after networking goals */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
              <p className="text-gray-600 text-sm mb-4">Tell us about yourself to personalize your experience</p>
            </div>

            <div className="space-y-4">
                {/* Name Fields - Separate First and Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <Input
                      value={data.firstName}
                      onChange={(e) => setData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter your first name"
                      autoComplete="given-name"
                    />
                  </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <Input
                      value={data.lastName}
                      onChange={(e) => setData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter your last name"
                      autoComplete="family-name"
                    />
                </div>
                </div>

                {/* Email Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={data.email}
                    onChange={(e) => setData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email address"
                    autoComplete="email"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We'll use this for account management and notifications
                  </p>
              </div>

                {/* LinkedIn Profile URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn Profile URL
                  </label>
                  <Input
                    type="url"
                    value={data.linkedinProfileUrl}
                    onChange={(e) => setData(prev => ({ ...prev, linkedinProfileUrl: e.target.value }))}
                    placeholder={generateLinkedInPlaceholder()}
                    autoComplete="url"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We'll use this to help you download your LinkedIn connections and analyze your network
                  </p>
            </div>
          </div>
        </div>

          {/* Step 4: Target Companies - Optional */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Target Companies</h3>
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
                          variant={data.targetCompanies.includes(company) ? "default" : "outline"}
                          className="cursor-pointer hover:bg-blue-100"
                          onClick={() => handleCompanyToggle(company)}
                        >
                          {company}
                          {data.targetCompanies.includes(company) && (
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
                        autoComplete="organization"
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
              {data.targetCompanies.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selected Companies ({data.targetCompanies.length})
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {data.targetCompanies.map((company) => (
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

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <div className="flex-1"></div>
            <Button
              onClick={handleSubmit}
              disabled={!canProceed()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Continue Setup
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="text-center">
            <p className="text-sm text-gray-500">Step 2 of 5 - Complete Profile & Goals</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}