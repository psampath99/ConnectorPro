import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Trash2,
  Download
} from 'lucide-react';
import { storage } from '@/lib/storage';

interface FileUpload {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadSource: string;
  contactsImported: number;
  totalRows: number;
  status: 'success' | 'failed' | 'processing';
  errorMessage?: string;
  uploadedAt: string;
  updatedAt: string;
  metadata?: {
    originalFileName?: string;
    processingDuration?: number;
    legacy?: boolean;
    [key: string]: any;
  };
}

interface FileUploadHistoryProps {
  onFileClick?: (upload: FileUpload) => void;
}

export const FileUploadHistory = ({ onFileClick }: FileUploadHistoryProps) => {
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUploadHistory();
  }, []);

  const fetchUploadHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // For demo mode, get from localStorage first
      const demoUploads = getLocalStorageUploads();
      
      // Try to fetch from API (will fail in demo mode but that's ok)
      try {
        const response = await fetch('http://localhost:8000/api/v1/file-uploads/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUploads(data.uploads || []);
        } else {
          // Fallback to localStorage for demo mode
          setUploads(demoUploads);
        }
      } catch (apiError) {
        // Fallback to localStorage for demo mode
        setUploads(demoUploads);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch upload history');
    } finally {
      setLoading(false);
    }
  };

  const getLocalStorageUploads = (): FileUpload[] => {
    try {
      // Get from new file upload history storage
      const history = storage.getFileUploadHistory();
      if (history && history.length > 0) {
        return history;
      }

      // Fallback to old CSV upload state for backward compatibility
      const csvState = storage.getCsvUploadState();
      if (csvState.csvUploaded && csvState.csvImportResult) {
        const result = csvState.csvImportResult;
        return [{
          id: 'legacy-upload-' + Date.now(),
          fileName: result.fileName || 'LinkedIn_Connections.csv',
          fileSize: result.fileSize || 0,
          fileType: 'text/csv',
          uploadSource: 'csv',
          contactsImported: result.imported || result.contactsImported || 0,
          totalRows: result.total || 0,
          status: result.success ? 'success' : 'failed',
          uploadedAt: csvState.csvUploadTimestamp || new Date().toISOString(),
          updatedAt: csvState.csvUploadTimestamp || new Date().toISOString(),
          metadata: {
            originalFileName: result.fileName,
            legacy: true
          }
        }];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting localStorage uploads:', error);
      return [];
    }
  };

  const handleFileClick = (upload: FileUpload) => {
    if (onFileClick) {
      onFileClick(upload);
    } else {
      // Default behavior - show file details
      alert(`File: ${upload.fileName}\nUploaded: ${new Date(upload.uploadedAt).toLocaleString()}\nContacts: ${upload.contactsImported}/${upload.totalRows}`);
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    if (!confirm('Are you sure you want to delete this upload record?')) {
      return;
    }

    try {
      // Try API first
      const response = await fetch(`http://localhost:8000/api/v1/file-uploads/${uploadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
        }
      });

      if (response.ok) {
        setUploads(uploads.filter(upload => upload.id !== uploadId));
      } else {
        throw new Error('Failed to delete upload record from API');
      }
    } catch (err) {
      // Fallback to localStorage for demo mode
      try {
        storage.removeFileUploadRecord(uploadId);
        setUploads(uploads.filter(upload => upload.id !== uploadId));
      } catch (localError) {
        setError('Failed to delete upload record');
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      processing: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>File Upload History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading upload history...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>File Upload History</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {uploads.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No file uploads yet</p>
            <p className="text-sm">Upload a CSV file to see your history here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(upload.status)}
                      <button
                        onClick={() => handleFileClick(upload)}
                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                      >
                        <span>{upload.fileName}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      {getStatusBadge(upload.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(upload.uploadedAt).toLocaleString()}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{upload.contactsImported} / {upload.totalRows} contacts</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <FileText className="w-4 h-4" />
                        <span>{formatFileSize(upload.fileSize)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <span className="capitalize">{upload.uploadSource}</span>
                      </div>
                    </div>

                    {upload.errorMessage && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        Error: {upload.errorMessage}
                      </div>
                    )}

                    {upload.metadata?.processingDuration && (
                      <div className="mt-2 text-xs text-gray-500">
                        Processing time: {upload.metadata.processingDuration.toFixed(2)}s
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFileClick(upload)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUpload(upload.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUploadHistory}
            className="w-full"
          >
            Refresh History
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploadHistory;