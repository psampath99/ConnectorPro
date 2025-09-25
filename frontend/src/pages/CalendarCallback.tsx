import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const CalendarCallback = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      // Send error message to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'CALENDAR_AUTH_ERROR',
          message: `Calendar authorization failed: ${error}`
        }, window.location.origin);
      }
      window.close();
      return;
    }

    if (code && state) {
      // Send success message to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'CALENDAR_AUTH_SUCCESS',
          code,
          state
        }, window.location.origin);
      }
      window.close();
    } else {
      // Send error for missing parameters
      if (window.opener) {
        window.opener.postMessage({
          type: 'CALENDAR_AUTH_ERROR',
          message: 'Missing authorization code or state parameter'
        }, window.location.origin);
      }
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing Calendar authorization...</p>
      </div>
    </div>
  );
};

export default CalendarCallback;