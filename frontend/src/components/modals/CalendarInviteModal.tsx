import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, X, Users, AlertCircle, CheckCircle, Clock, MapPin } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface CalendarInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledTitle?: string;
  prefilledAttendees?: string[];
  prefilledDescription?: string;
}

export const CalendarInviteModal = ({
  isOpen,
  onClose,
  prefilledTitle = '',
  prefilledAttendees = [],
  prefilledDescription = ''
}: CalendarInviteModalProps) => {
  const [title, setTitle] = useState(prefilledTitle);
  const [description, setDescription] = useState(prefilledDescription);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [attendees, setAttendees] = useState(prefilledAttendees.join(', '));
  const [duration, setDuration] = useState('60'); // Default 60 minutes
  const [isCreating, setIsCreating] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(true); // Will be checked on mount

  // Check Calendar connection status
  const checkCalendarConnection = async () => {
    try {
      const token = localStorage.getItem('connectorpro_auth_token');
      const response = await fetch('/api/v1/calendar/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCalendarConnected(data.status === 'connected');
      } else {
        setCalendarConnected(false);
      }
    } catch (error) {
      console.error('Error checking Calendar connection:', error);
      setCalendarConnected(false);
    }
  };

  // Check connection when modal opens
  useState(() => {
    if (isOpen) {
      checkCalendarConnection();
      
      // Set default date/time to current time + 1 hour
      const now = new Date();
      const startDateTime = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
      const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60 * 1000);
      
      setStartDate(startDateTime.toISOString().split('T')[0]);
      setStartTime(startDateTime.toTimeString().slice(0, 5));
      setEndDate(endDateTime.toISOString().split('T')[0]);
      setEndTime(endDateTime.toTimeString().slice(0, 5));
    }
  });

  // Update end time when duration changes
  const handleDurationChange = (newDuration: string) => {
    setDuration(newDuration);
    
    if (startDate && startTime) {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(newDuration) * 60 * 1000);
      
      setEndDate(endDateTime.toISOString().split('T')[0]);
      setEndTime(endDateTime.toTimeString().slice(0, 5));
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      showError('Please enter an event title');
      return;
    }

    if (!startDate || !startTime) {
      showError('Please select start date and time');
      return;
    }

    if (!calendarConnected) {
      showError('Calendar not connected. Please connect your Google Calendar first.');
      return;
    }

    setIsCreating(true);

    try {
      const token = localStorage.getItem('connectorpro_auth_token');
      
      // Parse attendees
      const attendeeList = attendees
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0)
        .map(email => ({ email }));

      // Create start and end datetime strings
      const startDateTime = `${startDate}T${startTime}:00`;
      const endDateTime = endDate && endTime ? `${endDate}T${endTime}:00` : 
        new Date(new Date(`${startDate}T${startTime}:00`).getTime() + parseInt(duration) * 60 * 1000).toISOString().slice(0, 19);

      const response = await fetch('/api/v1/calendar/create-event', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: title.trim(),
          description: description.trim(),
          start_time: startDateTime,
          end_time: endDateTime,
          location: location.trim(),
          attendees: attendeeList
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess('Calendar event created successfully!');
        
        // Reset form
        setTitle('');
        setDescription('');
        setStartDate('');
        setStartTime('');
        setEndDate('');
        setEndTime('');
        setLocation('');
        setAttendees('');
        setDuration('60');
        
        // Close modal
        onClose();
      } else {
        const errorData = await response.json();
        showError(errorData.detail || 'Failed to create calendar event');
      }
    } catch (error) {
      console.error('Error creating calendar event:', error);
      showError('Failed to create calendar event. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      onClose();
    }
  };

  const connectCalendar = async () => {
    try {
      const token = localStorage.getItem('connectorpro_auth_token');
      const response = await fetch('/api/v1/calendar/auth-url', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        window.open(data.auth_url, '_blank');
      } else {
        showError('Failed to get Calendar authorization URL');
      }
    } catch (error) {
      console.error('Error getting Calendar auth URL:', error);
      showError('Failed to connect Calendar');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            <span>Schedule Meeting</span>
            {calendarConnected && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Calendar Connected
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Calendar Connection Warning */}
          {!calendarConnected && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Google Calendar is not connected. 
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-yellow-800 underline ml-1"
                  onClick={connectCalendar}
                >
                  Connect Calendar
                </Button> 
                to create events.
              </AlertDescription>
            </Alert>
          )}

          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              placeholder="Meeting with..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isCreating}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date *</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time *</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isCreating}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => handleDurationChange(e.target.value)}
              disabled={isCreating}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="location"
                placeholder="Meeting room, video call link, or address"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isCreating}
                className="pl-10"
              />
            </div>
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <Label htmlFor="attendees">Attendees</Label>
            <div className="relative">
              <Users className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
              <Textarea
                id="attendees"
                placeholder="Enter email addresses separated by commas"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                rows={3}
                disabled={isCreating}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-gray-500">
              Example: john@company.com, jane@company.com
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Meeting agenda, notes, or additional details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={isCreating}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={isCreating || !calendarConnected}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Create Event
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};