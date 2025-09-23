import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { storage } from '@/lib/storage';
import { Contact } from '@/types';
import { 
  Network as NetworkIcon, 
  Users, 
  Building2, 
  Target,
  Route,
  TrendingUp,
  Eye,
  Filter,
  Zap,
  ArrowRight,
  MessageSquare,
  Calendar,
  Star
} from 'lucide-react';

const Network = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'company' | 'bridges'>('overview');

  useEffect(() => {
    setContacts(storage.getContacts());
    
    // Get target companies from onboarding
    const companies = localStorage.getItem('connectorpro_target_companies');
    if (companies) {
      setTargetCompanies(JSON.parse(companies));
    }
  }, []);

  // Network analysis functions
  const getNetworkStats = () => {
    const total = contacts.length;
    const firstDegree = contacts.filter(c => c.degree === 1).length;
    const secondDegree = contacts.filter(c => c.degree === 2).length;
    const companies = [...new Set(contacts.map(c => c.company))].length;
    const targetCompanyContacts = contacts.filter(c => targetCompanies.includes(c.company)).length;

    return {
      total,
      firstDegree,
      secondDegree,
      companies,
      targetCompanyContacts
    };
  };

  const getBridgeOpportunities = () => {
    const bridges = [];
    
    // Find 1st degree contacts that can bridge to 2nd degree targets
    const firstDegreeContacts = contacts.filter(c => c.degree === 1);
    const secondDegreeTargets = contacts.filter(c => 
      c.degree === 2 && targetCompanies.includes(c.company)
    );

    for (const target of secondDegreeTargets) {
      const potentialBridges = firstDegreeContacts.filter(bridge =>
        bridge.commonalities.some(bridgeComm =>
          target.commonalities.some(targetComm => 
            bridgeComm.type === targetComm.type ||
            (bridgeComm.type === 'employer' && bridgeComm.description.toLowerCase().includes(target.company.toLowerCase()))
          )
        )
      );

      if (potentialBridges.length > 0) {
        const bestBridge = potentialBridges.reduce((best, current) => {
          const bestScore = best.commonalities.filter(c => 
            target.commonalities.some(tc => tc.type === c.type)
          ).length;
          const currentScore = current.commonalities.filter(c => 
            target.commonalities.some(tc => tc.type === c.type)
          ).length;
          return currentScore > bestScore ? current : best;
        });

        bridges.push({
          target,
          bridge: bestBridge,
          bridgeCount: potentialBridges.length,
          confidence: Math.min(0.9, 0.5 + (potentialBridges.length * 0.1))
        });
      }
    }

    return bridges.sort((a, b) => b.confidence - a.confidence);
  };

  const getCompanyNetworkMap = (company: string) => {
    const companyContacts = contacts.filter(c => c.company === company);
    const firstDegree = companyContacts.filter(c => c.degree === 1);
    const secondDegree = companyContacts.filter(c => c.degree === 2);
    
    // Find bridge paths for 2nd degree contacts
    const bridgePaths = secondDegree.map(target => {
      const bridges = contacts.filter(bridge => 
        bridge.degree === 1 && 
        bridge.commonalities.some(bridgeComm =>
          target.commonalities.some(targetComm => bridgeComm.type === targetComm.type)
        )
      );
      
      return {
        target,
        bridges: bridges.slice(0, 3), // Top 3 bridges
        bridgeCount: bridges.length
      };
    });

    return {
      company,
      firstDegree,
      secondDegree,
      bridgePaths,
      totalContacts: companyContacts.length
    };
  };

  const stats = getNetworkStats();
  const bridgeOpportunities = getBridgeOpportunities();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Network</h1>
              <p className="text-gray-600">Visualize your network and discover connection opportunities</p>
            </div>

            {/* Network Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">1st Degree</p>
                      <p className="text-2xl font-bold text-green-600">{stats.firstDegree}</p>
                    </div>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold text-sm">1°</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">2nd Degree</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.secondDegree}</p>
                    </div>
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 font-bold text-sm">2°</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Companies</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.companies}</p>
                    </div>
                    <Building2 className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Target Cos</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.targetCompanyContacts}</p>
                    </div>
                    <Target className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* View Controls */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">View:</span>
                    </div>
                    <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="overview">Network Overview</SelectItem>
                        <SelectItem value="company">Company Deep Dive</SelectItem>
                        <SelectItem value="bridges">Bridge Opportunities</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {viewMode === 'company' && (
                    <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Companies</SelectItem>
                          {targetCompanies.map(company => (
                            <SelectItem key={company} value={company}>{company}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Network Overview */}
            {viewMode === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Target Company Network Map */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="w-5 h-5" />
                      <span>Target Company Networks</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {targetCompanies.map(company => {
                        const companyMap = getCompanyNetworkMap(company);
                        return (
                          <div key={company} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <Building2 className="w-4 h-4 text-blue-600" />
                                <span className="font-medium">{company}</span>
                              </div>
                              <Badge variant="outline">{companyMap.totalContacts} contacts</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="text-center p-2 bg-green-50 rounded">
                                <p className="font-bold text-green-600">{companyMap.firstDegree.length}</p>
                                <p className="text-green-700">1st Degree</p>
                              </div>
                              <div className="text-center p-2 bg-yellow-50 rounded">
                                <p className="font-bold text-yellow-600">{companyMap.secondDegree.length}</p>
                                <p className="text-yellow-700">2nd Degree</p>
                              </div>
                              <div className="text-center p-2 bg-blue-50 rounded">
                                <p className="font-bold text-blue-600">{companyMap.bridgePaths.length}</p>
                                <p className="text-blue-700">Bridge Paths</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Network Strength Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5" />
                      <span>Network Strength</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-medium text-green-900">Strong Connections</p>
                          <p className="text-sm text-green-700">1st degree contacts you can reach directly</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">{stats.firstDegree}</p>
                          <p className="text-xs text-green-600">{Math.round((stats.firstDegree / stats.total) * 100)}% of network</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div>
                          <p className="font-medium text-yellow-900">Bridge Opportunities</p>
                          <p className="text-sm text-yellow-700">2nd degree contacts via introductions</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-yellow-600">{stats.secondDegree}</p>
                          <p className="text-xs text-yellow-600">{Math.round((stats.secondDegree / stats.total) * 100)}% of network</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium text-blue-900">Target Company Reach</p>
                          <p className="text-sm text-blue-700">Contacts at your target companies</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">{stats.targetCompanyContacts}</p>
                          <p className="text-xs text-blue-600">{Math.round((stats.targetCompanyContacts / stats.total) * 100)}% of network</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Company Deep Dive */}
            {viewMode === 'company' && selectedCompany !== 'all' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5" />
                    <span>{selectedCompany} Network Map</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const companyMap = getCompanyNetworkMap(selectedCompany);
                    return (
                      <div className="space-y-6">
                        {/* Company Stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{companyMap.firstDegree.length}</p>
                            <p className="text-sm text-green-700">Direct Connections</p>
                          </div>
                          <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <p className="text-2xl font-bold text-yellow-600">{companyMap.secondDegree.length}</p>
                            <p className="text-sm text-yellow-700">2nd Degree Targets</p>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">{companyMap.bridgePaths.length}</p>
                            <p className="text-sm text-blue-700">Available Bridge Paths</p>
                          </div>
                        </div>

                        {/* Bridge Paths Visualization */}
                        {companyMap.bridgePaths.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-4">Bridge Path Opportunities</h4>
                            <div className="space-y-4">
                              {companyMap.bridgePaths.slice(0, 5).map((path, index) => (
                                <div key={path.target.id} className="border rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                      <Avatar className="w-8 h-8">
                                        <AvatarFallback className="bg-yellow-100 text-yellow-700">
                                          {path.target.name.split(' ').map(n => n[0]).join('')}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="font-medium">{path.target.name}</p>
                                        <p className="text-sm text-gray-600">{path.target.title}</p>
                                      </div>
                                    </div>
                                    <Badge variant="outline">{path.bridgeCount} bridges</Badge>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <span>Best bridges:</span>
                                    {path.bridges.slice(0, 3).map((bridge, i) => (
                                      <div key={bridge.id} className="flex items-center space-x-1">
                                        {i > 0 && <span>•</span>}
                                        <span className="font-medium">{bridge.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <div className="flex items-center space-x-2 mt-3">
                                    <Button size="sm">
                                      <MessageSquare className="w-3 h-3 mr-1" />
                                      Request Intro
                                    </Button>
                                    <Button size="sm" variant="outline">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      Schedule
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Bridge Opportunities */}
            {viewMode === 'bridges' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Route className="w-5 h-5" />
                    <span>Top Bridge Opportunities</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bridgeOpportunities.slice(0, 10).map((opportunity, index) => (
                      <div key={opportunity.target.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="flex flex-col items-center">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-yellow-100 text-yellow-700">
                                  {opportunity.target.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <ArrowRight className="w-4 h-4 text-gray-400 my-1" />
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-green-100 text-green-700">
                                  {opportunity.bridge.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium text-gray-900">{opportunity.target.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(opportunity.confidence * 100)}% confidence
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                {opportunity.target.title} at {opportunity.target.company}
                              </p>
                              
                              <div className="bg-green-50 rounded p-2 mb-2">
                                <p className="text-xs text-green-800">
                                  <strong>Bridge via:</strong> {opportunity.bridge.name} ({opportunity.bridge.company})
                                </p>
                                <p className="text-xs text-green-700">
                                  {opportunity.bridgeCount} potential bridge{opportunity.bridgeCount > 1 ? 's' : ''} available
                                </p>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Button size="sm">
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  Request Intro
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Star className="w-3 h-3 mr-1" />
                                  Save
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <Badge className="bg-blue-100 text-blue-800">
                              <Target className="w-3 h-3 mr-1" />
                              Target Co
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Network;