import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Linkedin, Mail, CalendarDays } from 'lucide-react';

interface Step2IntegrationsProps {
  onNext: () => void;
  onBack: () => void;
}

export function Step2_Integrations({ onNext, onBack }: Step2IntegrationsProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Connect your platforms</h3>
        <p className="text-gray-600">Integrate with your existing tools for seamless networking</p>
      </div>

      {/* LinkedIn Integration - Required */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Linkedin className="w-8 h-8" />
            <div>
              <h4 className="text-lg font-semibold">LinkedIn Network Import</h4>
              <p className="text-blue-100 text-sm">Required - Choose your preferred method</p>
            </div>
          </div>
          <CheckCircle className="w-6 h-6 text-green-300" />
        </div>
        
        <div className="bg-white/20 rounded p-3">
          <p className="text-sm">✅ LinkedIn integration will be implemented here</p>
          <p className="text-xs text-blue-100 mt-1">
            This will include both API connection and CSV upload options
          </p>
        </div>
      </div>

      {/* Email Integration */}
      <div className="border-2 border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Mail className="w-8 h-8 text-red-600" />
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Gmail Integration</h4>
              <p className="text-gray-600 text-sm">Recommended - Send introduction requests</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <p className="text-sm text-gray-800">📧 Email integration will be implemented here</p>
        </div>
      </div>

      {/* Calendar Integration */}
      <div className="border-2 border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <CalendarDays className="w-8 h-8 text-green-600" />
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Google Calendar</h4>
              <p className="text-gray-600 text-sm">Optional - Schedule meetings automatically</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <p className="text-sm text-gray-800">📅 Calendar integration will be implemented here</p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}