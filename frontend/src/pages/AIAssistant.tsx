import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AIAssistantQueryInterface } from '@/components/ai-assistant/AIAssistantQueryInterface';
import {
  Bot as BotIcon,
  Users,
  Building2,
  Target,
  Loader2,
  AlertCircle
} from 'lucide-react';

const AIAssistant = () => {
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalContacts: 0,
    companyCoverage: 0,
    totalTargetCompanies: 0,
    targetCompanyCoverage: 0,
    isLoadingAnalytics: true
  });

  // Fetch target companies from backend API
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
      const parsedCompanies = JSON.parse(companies);
      setTargetCompanies(parsedCompanies);
      return parsedCompanies;
    }
    return [];
  };

  // Fetch comprehensive analytics data
  const fetchAnalytics = async () => {
    try {
      setAnalytics(prev => ({ ...prev, isLoadingAnalytics: true }));
      
      // Fetch all required data in parallel
      const [contactStatsResponse, targetCompaniesResponse, groupedContactsResponse] = await Promise.all([
        fetch('http://localhost:8000/api/v1/contacts/stats', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
          }
        }),
        fetch('http://localhost:8000/api/v1/target-companies', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
          }
        }),
        fetch('http://localhost:8000/api/v1/contacts/grouped-by-company?require_title=true', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
          }
        })
      ]);

      // Process contact stats
      let totalContacts = 0;
      if (contactStatsResponse.ok) {
        const contactStats = await contactStatsResponse.json();
        totalContacts = contactStats.totalActiveContacts || 0;
      }

      // Process target companies
      let totalTargetCompanies = 0;
      if (targetCompaniesResponse.ok) {
        const targetCompaniesData = await targetCompaniesResponse.json();
        totalTargetCompanies = targetCompaniesData.companies?.length || 0;
      }

      // Process grouped contacts for coverage metrics
      let companyCoverage = 0;
      let targetCompanyCoverage = 0;
      if (groupedContactsResponse.ok) {
        const groupedData = await groupedContactsResponse.json();
        if (groupedData.success) {
          companyCoverage = groupedData.companies_with_contacts || 0;
          
          // Count target companies that have contacts
          let targetCompanyNames: string[] = [];
          if (targetCompanies.length > 0) {
            targetCompanyNames = targetCompanies;
          } else if (targetCompaniesResponse.ok) {
            const targetCompaniesData = await targetCompaniesResponse.json();
            targetCompanyNames = targetCompaniesData.companies?.map((tc: any) => tc.company_name) || [];
          }
          
          if (groupedData.companies && targetCompanyNames.length > 0) {
            targetCompanyCoverage = Object.keys(groupedData.companies).filter(company =>
              targetCompanyNames.includes(company)
            ).length;
          }
        }
      }

      setAnalytics({
        totalContacts,
        companyCoverage,
        totalTargetCompanies,
        targetCompanyCoverage,
        isLoadingAnalytics: false
      });

      console.log('Analytics updated:', {
        totalContacts,
        companyCoverage,
        totalTargetCompanies,
        targetCompanyCoverage
      });

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setAnalytics(prev => ({ ...prev, isLoadingAnalytics: false }));
    }
  };

  useEffect(() => {
    // Fetch analytics data on component mount
    fetchAnalytics();
    fetchTargetCompanies();
  }, []);

  // Update analytics when target companies change
  useEffect(() => {
    if (targetCompanies.length > 0) {
      fetchAnalytics();
    }
  }, [targetCompanies.length]);


  const refreshAnalytics = () => {
    fetchAnalytics();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-white">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  AI Assistant
                </h1>
                <p className="text-gray-600">
                  AI-powered networking assistant with comprehensive contact analytics
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={refreshAnalytics}
                  disabled={analytics.isLoadingAnalytics}
                  variant="outline"
                  size="sm"
                >
                  {analytics.isLoadingAnalytics ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <BotIcon className="w-4 h-4 mr-2" />
                  )}
                  Refresh Analytics
                </Button>
              </div>
            </div>

            {/* Analytics Section */}
            {!analytics.isLoadingAnalytics && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    {/* Line 1: Total Contacts, Company Coverage */}
                    <div className="text-lg font-semibold text-gray-900">
                      <span className="text-blue-600">Total Contacts: {analytics.totalContacts.toLocaleString()}</span>
                      <span className="mx-4 text-gray-400">•</span>
                      <span className="text-green-600">Company Coverage: {analytics.companyCoverage}</span>
                    </div>
                    
                    {/* Line 2: Total Target Companies, Target Company Coverage */}
                    <div className="text-lg font-semibold text-gray-900">
                      <span className="text-purple-600">Total Target Companies: {analytics.totalTargetCompanies}</span>
                      <span className="mx-4 text-gray-400">•</span>
                      <span className="text-orange-600">Target Company Coverage: {analytics.targetCompanyCoverage}</span>
                    </div>
                    
                    {/* Additional context */}
                    <div className="text-sm text-gray-600 mt-3">
                      <div className="flex items-center justify-center space-x-6">
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-blue-500" />
                          <span>All contacts in your network</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Building2 className="w-4 h-4 text-green-500" />
                          <span>Companies with contacts</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Target className="w-4 h-4 text-orange-500" />
                          <span>Target companies with connections</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analytics Loading State */}
            {analytics.isLoadingAnalytics && (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center space-x-3">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="text-gray-600">Loading network analytics...</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <h3 className="font-medium text-red-900">Error Loading Data</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Assistant Query Interface */}
            <AIAssistantQueryInterface className="mt-6" />
          </div>
        </div>

      </main>
    </div>
  );
};

export default AIAssistant;