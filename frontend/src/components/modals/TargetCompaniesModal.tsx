import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Building2, 
  Plus, 
  X, 
  Save, 
  Settings
} from 'lucide-react';

const commonCompanies = [
  'Google', 'Meta', 'Apple', 'Microsoft', 'Amazon', 'Netflix', 'Tesla', 'Stripe', 
  'Airbnb', 'Uber', 'LinkedIn', 'Salesforce', 'Adobe', 'Zoom', 'Slack', 'Figma',
  'Notion', 'Spotify', 'Twitter', 'TikTok', 'Snapchat', 'Pinterest', 'Dropbox', 'Square'
];

interface TargetCompaniesModalProps {
  onUpdate?: () => void;
  trigger?: React.ReactNode;
}

export function TargetCompaniesModal({ onUpdate, trigger }: TargetCompaniesModalProps) {
  const [open, setOpen] = useState(false);
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [customCompany, setCustomCompany] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalTargetCompanies, setOriginalTargetCompanies] = useState<string[]>([]);

  // Fetch target companies from backend API (similar to Settings page)
  const fetchTargetCompanies = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/target-companies', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.companies) {
          const companyNames = data.companies.map((tc: any) => tc.company_name);
          setTargetCompanies(companyNames);
          setOriginalTargetCompanies(companyNames);
          console.log('Loaded target companies from API:', companyNames);
          return companyNames;
        }
      }
    } catch (err) {
      console.error('Error fetching target companies from API:', err);
    }
    
    // Fallback to localStorage
    const companies = localStorage.getItem('connectorpro_target_companies');
    if (companies) {
      try {
        const parsedCompanies = JSON.parse(companies);
        setTargetCompanies(parsedCompanies);
        setOriginalTargetCompanies(parsedCompanies);
        console.log('Loaded target companies from localStorage:', parsedCompanies);
        return parsedCompanies;
      } catch (error) {
        console.error('Error parsing target companies:', error);
        setTargetCompanies([]);
        setOriginalTargetCompanies([]);
      }
    }
    return [];
  };

  useEffect(() => {
    if (open) {
      // Load target companies from API first, then fallback to localStorage
      fetchTargetCompanies();
    }
  }, [open]);

  useEffect(() => {
    // Check if target companies have changed
    const companiesChanged = JSON.stringify(targetCompanies.sort()) !== JSON.stringify(originalTargetCompanies.sort());
    setHasChanges(companiesChanged);
  }, [targetCompanies, originalTargetCompanies]);

  const handleCompanyToggle = (company: string) => {
    setTargetCompanies(prev => 
      prev.includes(company)
        ? prev.filter(c => c !== company)
        : [...prev, company]
    );
  };

  const handleAddCustomCompany = () => {
    if (customCompany.trim() && !targetCompanies.includes(customCompany.trim())) {
      setTargetCompanies(prev => [...prev, customCompany.trim()]);
      setCustomCompany('');
    }
  };

  const handleRemoveCompany = (company: string) => {
    setTargetCompanies(prev => prev.filter(c => c !== company));
  };

  const handleSaveChanges = async () => {
    console.log('🔍 DEBUG - TargetCompaniesModal handleSaveChanges called with companies:', targetCompanies);
    
    try {
      // Save to backend API using bulk endpoint
      const response = await fetch('http://localhost:8000/api/v1/target-companies/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        },
        body: JSON.stringify(
          targetCompanies.map(company => ({
            company_name: company,
            company_domains: [] // Default empty domains, can be enhanced later
          }))
        )
      });

      console.log('🔍 DEBUG - API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 DEBUG - API response data:', data);
        
        if (data.success) {
          // Also save to localStorage as backup
          localStorage.setItem('connectorpro_target_companies', JSON.stringify(targetCompanies));
          setOriginalTargetCompanies([...targetCompanies]);
          setHasChanges(false);
          setOpen(false);
          console.log('✅ Successfully saved target companies to backend and localStorage');
          
          // Trigger page refresh/update if callback provided
          if (onUpdate) {
            onUpdate();
          }
          
          // Trigger a page reload to update all components
          window.location.reload();
        } else {
          console.error('❌ Backend API returned success=false:', data);
          throw new Error(data.message || 'Failed to save target companies');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Backend API error:', response.status, errorText);
        throw new Error(`API error: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error saving target companies to backend:', error);
      
      // Fallback to localStorage only
      console.log('🔄 Falling back to localStorage only');
      localStorage.setItem('connectorpro_target_companies', JSON.stringify(targetCompanies));
      setOriginalTargetCompanies([...targetCompanies]);
      setHasChanges(false);
      setOpen(false);
      
      // Show user a warning that backend save failed
      alert('Warning: Changes saved locally but failed to sync with server. Please try again or contact support if the issue persists.');
      
      // Trigger page refresh/update if callback provided
      if (onUpdate) {
        onUpdate();
      }
      
      // Trigger a page reload to update all components
      window.location.reload();
    }
  };

  const handleCancel = () => {
    setTargetCompanies([...originalTargetCompanies]);
    setHasChanges(false);
    setCustomCompany('');
    setOpen(false);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="flex items-center space-x-1">
      <Target className="w-3 h-3" />
      <span>Edit Targets</span>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Edit Target Companies</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Target Companies */}
          {targetCompanies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Current Target Companies ({targetCompanies.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {targetCompanies.map((company) => (
                  <Badge
                    key={company}
                    variant="default"
                    className="flex items-center space-x-1 pr-1"
                  >
                    <Building2 className="w-3 h-3" />
                    <span>{company}</span>
                    <button
                      onClick={() => handleRemoveCompany(company)}
                      className="ml-1 hover:bg-blue-700 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Add from Popular Companies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Add Popular Companies
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {commonCompanies
                .filter(company => !targetCompanies.includes(company))
                .map((company) => (
                  <Badge
                    key={company}
                    variant="outline"
                    className="cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                    onClick={() => handleCompanyToggle(company)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {company}
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
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCustomCompany();
                  }
                }}
              />
              <Button onClick={handleAddCustomCompany} disabled={!customCompany.trim()}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                // Navigate to full settings page
                window.location.href = '/settings';
              }}
              className="flex items-center space-x-1"
            >
              <Settings className="w-4 h-4" />
              <span>Full Settings</span>
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveChanges} 
                disabled={!hasChanges}
                className="flex items-center space-x-1"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}