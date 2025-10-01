import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, X, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface GmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledTo?: string;
  prefilledSubject?: string;
  prefilledBody?: string;
}

export const GmailComposeModal = ({
  isOpen,
  onClose,
  prefilledTo = '',
  prefilledSubject = '',
  prefilledBody = ''
}: GmailComposeModalProps) => {
  const [to, setTo] = useState(prefilledTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(prefilledSubject);
  const [body, setBody] = useState(prefilledBody);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(true); // Will be checked on mount

  // Check Gmail connection status
  const checkGmailConnection = async () => {
    try {
      const token = localStorage.getItem('connectorpro_auth_token');
      const response = await fetch('/api/v1/gmail/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGmailConnected(data.status === 'connected');
      } else {
        setGmailConnected(false);
      }
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
      setGmailConnected(false);
    }
  };

  // Check connection when modal opens
  useState(() => {
    if (isOpen) {
      checkGmailConnection();
    }
  });

  const handleSend = async () => {
    if (!to.trim()) {
      showError('Please enter a recipient email address');
      return;
    }

    if (!gmailConnected) {
      showError('Gmail not connected. Please connect your Gmail account first.');
      return;
    }

    setIsSending(true);

    try {
      const token = localStorage.getItem('connectorpro_auth_token');
      const response = await fetch('/api/v1/gmail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: to.trim(),
          cc: cc.trim() || undefined,
          bcc: bcc.trim() || undefined,
          subject: subject.trim(),
          body: body.trim(),
          body_type: 'plain'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess('Email sent successfully!');
        
        // Reset form
        setTo('');
        setCc('');
        setBcc('');
        setSubject('');
        setBody('');
        setShowCc(false);
        setShowBcc(false);
        
        // Close modal
        onClose();
      } else {
        const errorData = await response.json();
        showError(errorData.detail || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      showError('Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      onClose();
    }
  };

  const connectGmail = async () => {
    try {
      const token = localStorage.getItem('connectorpro_auth_token');
      const response = await fetch('/api/v1/gmail/auth-url', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        window.open(data.auth_url, '_blank');
      } else {
        showError('Failed to get Gmail authorization URL');
      }
    } catch (error) {
      console.error('Error getting Gmail auth URL:', error);
      showError('Failed to connect Gmail');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span>Compose Email</span>
            {gmailConnected && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Gmail Connected
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Gmail Connection Warning */}
          {!gmailConnected && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Gmail is not connected. 
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-yellow-800 underline ml-1"
                  onClick={connectGmail}
                >
                  Connect Gmail
                </Button> 
                to send emails.
              </AlertDescription>
            </Alert>
          )}

          {/* To Field */}
          <div className="space-y-2">
            <Label htmlFor="to">To *</Label>
            <Input
              id="to"
              type="email"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={isSending}
            />
          </div>

          {/* CC/BCC Toggle Buttons */}
          <div className="flex space-x-2">
            {!showCc && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCc(true)}
                disabled={isSending}
              >
                Add CC
              </Button>
            )}
            {!showBcc && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowBcc(true)}
                disabled={isSending}
              >
                Add BCC
              </Button>
            )}
          </div>

          {/* CC Field */}
          {showCc && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="cc">CC</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCc(false);
                    setCc('');
                  }}
                  disabled={isSending}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <Input
                id="cc"
                type="email"
                placeholder="cc@example.com"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                disabled={isSending}
              />
            </div>
          )}

          {/* BCC Field */}
          {showBcc && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bcc">BCC</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowBcc(false);
                    setBcc('');
                  }}
                  disabled={isSending}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <Input
                id="bcc"
                type="email"
                placeholder="bcc@example.com"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                disabled={isSending}
              />
            </div>
          )}

          {/* Subject Field */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
            />
          </div>

          {/* Body Field */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              placeholder="Write your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              disabled={isSending}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={isSending || !gmailConnected}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};