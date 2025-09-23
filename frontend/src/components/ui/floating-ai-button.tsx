import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bot, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FloatingAIButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  // Don't show on the AI Assistant page itself
  if (location.pathname === '/assistant') {
    return null;
  }

  const handleClick = () => {
    navigate('/assistant');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
          "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
          "group relative overflow-hidden"
        )}
        title="AI Assistant"
      >
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
        
        {/* Main icon */}
        <div className="relative flex items-center justify-center">
          {isHovered ? (
            <MessageSquare className="w-6 h-6 text-white transition-transform duration-200 scale-110" />
          ) : (
            <Bot className="w-6 h-6 text-white transition-transform duration-200" />
          )}
        </div>

        {/* Sparkle effect */}
        <Sparkles className="absolute top-1 right-1 w-3 h-3 text-yellow-300 opacity-75 animate-pulse" />
      </Button>

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute bottom-16 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Ask AI Assistant
          <div className="absolute top-full right-3 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}