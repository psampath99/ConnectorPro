import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface SettingsSectionHeaderProps {
  icon: React.ElementType;
  title: string;
  tooltip?: string;
  children?: React.ReactNode;
}

export const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({ icon: Icon, title, tooltip, children }) => {
  return (
    <div className="flex items-center justify-between pb-4 border-b border-gray-200">
      <div className="flex items-center space-x-3">
        <Icon className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
    </div>
  );
};