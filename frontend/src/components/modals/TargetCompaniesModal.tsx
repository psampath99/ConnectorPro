import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target } from 'lucide-react';

interface TargetCompaniesModalProps {
  onUpdate?: () => void;
  trigger?: React.ReactNode;
}

export function TargetCompaniesModal({ onUpdate, trigger }: TargetCompaniesModalProps) {
  const [open, setOpen] = useState(false);
  const [messageTone, setMessageTone] = useState<string>('');
  const [followupFrequency, setFollowupFrequency] = useState<string>('');

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Settings</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Message Tone Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Message Tone
            </label>
            <Select value={messageTone} onValueChange={setMessageTone}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select message tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Frequency of Follow-up Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Frequency of Follow-up
            </label>
            <Select value={followupFrequency} onValueChange={setFollowupFrequency}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select follow-up frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}