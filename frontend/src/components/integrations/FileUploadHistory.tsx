import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Trash2,
  RefreshCw
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
  refreshTrigger?: number; // Add refresh trigger prop
}

export const FileUploadHistory = ({ onFileClick, refreshTrigger }: FileUploadHistoryProps) => {
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchUploadHistory();
  }, [refreshTrigger]); // Re-fetch when refreshTrigger changes

  useEffect(() => {
    const handleToggleHistory = () => {
      if (!showHistory && !loading) {
        fetchUploadHistory();
      }
      setShowHistory(!showHistory);
    };

    window.addEventListener('toggleUploadHistory', handleToggleHistory);
    return () => window.removeEventListener('toggleUploadHistory', handleToggleHistory);
  }, [showHistory, loading]);

  const fetchUploadHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get uploads from localStorage (primary source for rolling history)
      const localUploads = getLocalStorageUploads();
      
      // Try to fetch from API as backup, but prioritize localStorage for consistency
      try {
        const response = await fetch('http://localhost:8000/api/v1/file-uploads/?limit=3', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'demo-token'}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const apiUploads = data.uploads || [];
          
          // Merge API uploads with local uploads, prioritizing local for consistency
          const mergedUploads = mergeUploads(localUploads, apiUploads);
          setUploads(mergedUploads);
        } else {
          // Use localStorage only
          setUploads(localUploads);
        }
      } catch (apiError) {
        // Use localStorage only
        setUploads(localUploads);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch upload history');
    } finally {
      setLoading(false);
    }
  };

  const mergeUploads = (localUploads: FileUpload[], apiUploads: FileUpload[]): FileUpload[] => {
    // Prioritize localStorage uploads for consistency, but merge with API data
    const allUploads = [...localUploads];
    
    // Add any API uploads that aren't already in localStorage
    for (const apiUpload of apiUploads) {
      const exists = localUploads.some(local =>
        local.id === apiUpload.id ||
        (local.fileName === apiUpload.fileName &&
         Math.abs(new Date(local.uploadedAt).getTime() - new Date(apiUpload.uploadedAt).getTime()) < 5000)
      );
      
      if (!exists) {
        allUploads.push(apiUpload);
      }
    }
    
    // Sort by upload date (newest first) and limit to exactly 3
    return allUploads
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 3);
  };

  const getLocalStorageUploads = (): FileUpload[] => {
    try {
      // Get from new file upload history storage (limit to 3)
      const history = storage.getFileUploadHistory();
      if (history && history.length > 0) {
        // History is already sorted newest first, limit to 3
        return history.slice(0, 3);
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
      // Enhanced default behavior - show detailed file information
      const details = [
        `📁 File: ${upload.fileName}`,
        `📅 Uploaded: ${new Date(upload.uploadedAt).toLocaleString()}`,
        `👥 Contacts: ${upload.contactsImported}/${upload.totalRows}`,
        `📊 Status: ${upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}`,
        `💾 Size: ${formatFileSize(upload.fileSize)}`,
        `🔗 Source: ${upload.uploadSource.toUpperCase()}`
      ];
      
      
      if (upload.metadata?.skippedDuplicates) {
        details.push(`🔄 Duplicates skipped: ${upload.metadata.skippedDuplicates}`);
      }
      
      if (upload.errorMessage && upload.status === 'failed') {
        details.push(`❌ Error: ${upload.errorMessage}`);
      }
      
      alert(details.join('\n'));
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

  return (
    <div className="w-full">
      {/* History Content - Only show when showHistory is true */}
      {showHistory && (
        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading upload history...</div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && uploads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No uploads yet</p>
            </div>
          ) : !loading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing last {uploads.length} upload{uploads.length !== 1 ? 's' : ''}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchUploadHistory}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              
              {uploads.map((upload, index) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getStatusIcon(upload.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <button
                          onClick={() => handleFileClick(upload)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-left truncate block max-w-full"
                        >
                          {upload.fileName}
                        </button>
                        {upload.status === 'success' && (
                          <ExternalLink className="w-3 h-3 text-blue-500 cursor-pointer" onClick={() => handleFileClick(upload)} />
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(upload.uploadedAt).toLocaleString()}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span>{upload.contactsImported} new / {upload.totalRows} processed</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <span>{formatFileSize(upload.fileSize)}</span>
                          {upload.status === 'success' && upload.contactsImported === 0 && upload.totalRows > 0 && (
                            <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
                              All duplicates - file processed successfully
                            </span>
                          )}
                          {upload.errorMessage && upload.status === 'failed' && (
                            <span className="text-red-600 text-xs bg-red-50 px-2 py-1 rounded truncate max-w-[200px]" title={upload.errorMessage}>
                              Error: {upload.errorMessage}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      {getStatusBadge(upload.status)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-3">
                    {upload.status === 'success' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileClick(upload)}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                        title="View file details"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUpload(upload.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                      title="Delete upload record"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploadHistory;