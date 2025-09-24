import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Download, Clock, ExternalLink } from 'lucide-react';

interface CSVImportProps {
  onContactsImported?: (contacts: any[]) => void;
}

export const CSVImport = ({ onContactsImported }: CSVImportProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      const validExtensions = ['.csv'];
      const validMimeTypes = [
        'text/csv',
        'application/csv',
        'text/plain'
      ];
      
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
      const hasValidMimeType = validMimeTypes.includes(file.type);
      
      // Special handling for Numbers and Excel files
      if (fileName.endsWith('.numbers')) {
        setError('Numbers files are not supported. Please export your Numbers file as CSV first.');
        return;
      }
      
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setError('Excel files are not yet supported. Please save your Excel file as CSV first.');
        return;
      }
      
      if (!hasValidExtension && !hasValidMimeType) {
        setError('Please select a valid CSV file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a CSV file first');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    setProgressMessage('Preparing upload...');
    setUploadStartTime(Date.now());
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate progress updates during upload with better timing
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 95) {
            const increment = Math.random() * 8 + 2; // 2-10% increments
            const newProgress = Math.min(prev + increment, 95);
            
            if (newProgress < 25) {
              setProgressMessage('Uploading file...');
            } else if (newProgress < 50) {
              setProgressMessage('Processing CSV headers...');
            } else if (newProgress < 80) {
              setProgressMessage('Parsing contact data...');
            } else if (newProgress < 95) {
              setProgressMessage('Validating contacts...');
            }
            
            return newProgress;
          }
          return prev;
        });
      }, 150); // Faster updates

      const response = await fetch('http://localhost:8000/api/v1/contacts/import/csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      });

      clearInterval(progressInterval);
      
      // Immediately jump to 98% to show we got a response
      setUploadProgress(98);
      setProgressMessage('Processing response...');

      if (!response.ok) {
        let errorMessage = 'Failed to import CSV';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.error?.message || errorData.message || errorMessage;
          
          // Handle specific error cases
          if (response.status === 408) {
            errorMessage = 'Upload timed out. Please try with a smaller file or contact support.';
          } else if (response.status === 400 && errorMessage.includes('Detected headers:')) {
            // This is a detailed error with header information - show it nicely
            errorMessage = errorMessage;
          }
        } catch {
          errorMessage = `Failed to import CSV (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorMessage);
      }

      // Complete the progress bar immediately when response is received
      clearInterval(progressInterval);
      setProgressMessage('Finalizing import...');
      setUploadProgress(100);

      const result = await response.json();
      console.log('CSV Import Result:', result);
      setImportResult(result);
      
      // Record upload history
      const { storage } = await import('@/lib/storage');
      const uploadRecord = {
        id: result.uploadId || `upload-${Date.now()}`,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type || 'text/csv',
        uploadSource: 'csv' as const,
        contactsImported: result.imported || result.contactsImported || 0,
        totalRows: result.total || 0,
        status: result.success ? 'success' as const : 'failed' as const,
        errorMessage: result.success ? undefined : result.message,
        uploadedAt: result.uploadedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          originalFileName: selectedFile.name,
          fileSize: selectedFile.size,
          processingDuration: result.processingDuration
        }
      };
      
      storage.addFileUploadRecord(uploadRecord);
      
      // Save imported contacts to localStorage for dashboard display
      if (result.contacts && Array.isArray(result.contacts) && result.contacts.length > 0) {
        try {
          const formattedContacts = result.contacts.map((contact: any) => ({
            id: contact.id || contact._id,
            name: contact.name,
            title: contact.title,
            company: contact.company,
            email: contact.email || '',
            linkedinUrl: contact.linkedinUrl || '',
            degree: contact.degree,
            relationshipStrength: contact.relationshipStrength,
            commonalities: contact.commonalities || [],
            notes: contact.notes || '',
            tags: contact.tags || [],
            addedAt: contact.addedAt ? new Date(contact.addedAt) : new Date(),
            linkedinData: contact.linkedinData || {}
          }));
          
          // Add to existing contacts in localStorage
          const existingContacts = storage.getContacts();
          const allContacts = [...existingContacts, ...formattedContacts];
          storage.setContacts(allContacts);
          
          console.log(`Saved ${formattedContacts.length} contacts to localStorage for dashboard display`);
          
          if (onContactsImported) {
            onContactsImported(formattedContacts);
          }
        } catch (contactError) {
          console.error('Error processing contacts:', contactError);
          // Continue anyway, don't block the UI
        }
      } else {
        console.log('No contacts to save or contacts is not an array');
        if (onContactsImported) {
          onContactsImported([]);
        }
      }

      // Clear the file input on success
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import CSV file';
      setError(errorMessage);
      setUploadProgress(0);
      setProgressMessage('');
      
      // Record failed upload
      if (selectedFile) {
        const { storage } = await import('@/lib/storage');
        const uploadRecord = {
          id: `failed-upload-${Date.now()}`,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type || 'text/csv',
          uploadSource: 'csv' as const,
          contactsImported: 0,
          totalRows: 0,
          status: 'failed' as const,
          errorMessage: errorMessage,
          uploadedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {
            originalFileName: selectedFile.name,
            fileSize: selectedFile.size
          }
        };
        
        storage.addFileUploadRecord(uploadRecord);
      }
    } finally {
      setIsUploading(false);
      if (!error && !importResult) {
        // Only clear progress if there was an error
        setTimeout(() => {
          setUploadProgress(0);
          setProgressMessage('');
        }, 2000);
      }
    }
  };

  const getElapsedTime = () => {
    if (!uploadStartTime) return '';
    const elapsed = Math.round((Date.now() - uploadStartTime) / 1000);
    return elapsed > 0 ? `${elapsed}s` : '';
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setError(null);
    setImportResult(null);
    setUploadProgress(0);
    setProgressMessage('');
    setUploadStartTime(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['First Name', 'Last Name', 'URL', 'Email Address', 'Company', 'Position', 'Connected On'],
      ['Rachael', 'Northrup', 'https://www.linkedin.com/in/rachaelnorthrup', '', 'ZR Recruiting', 'Startup Recruiter | Co-CEO', '25 Jun 2023'],
      ['Josh', 'Hudgins', 'https://www.linkedin.com/in/joshhudgins', '', 'VideoAmp', 'Chief Product Officer', '24 Jun 2023'],
      ['Tamar', 'Rosen', 'https://www.linkedin.com/in/tamar-rosen-5565b37', '', 'ServiceTitan', 'Vice President of Product Management', '24 Jun 2023'],
      ['Andy', 'Mowat', 'https://www.linkedin.com/in/andymowat', '', 'Whispernet', 'Co-Founder', '23 Jun 2023'],
      ['Sarah', 'Ellis', 'https://www.linkedin.com/in/sarahellis', '', 'Blue & Company', 'Partner', '23 Jun 2023'],
      ['Martha', 'Kudel', 'https://www.linkedin.com/in/marthakudel', '', 'Zumigo', 'VP Product Management', '23 Jun 2023'],
      ['John', 'Smith', 'https://www.linkedin.com/in/johnsmith', 'john.smith@example.com', 'Tech Corp', 'Software Engineer', '22 Jun 2023'],
      ['Jane', 'Doe', 'https://www.linkedin.com/in/janedoe', 'jane.doe@company.com', 'Design Studio', 'UX Designer', '21 Jun 2023']
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'June-2025-LinkedIn_Connections.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <FileText className="w-6 h-6 text-green-600" />
        <h2 className="text-xl font-semibold">CSV Import</h2>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Instructions - Compact */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">How to get your LinkedIn CSV</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>1. Go to LinkedIn → Settings & Privacy → Data Privacy</p>
          <p>2. Click "Get a copy of your data"</p>
          <p>3. Select "Connections" and request your data</p>
          <p>4. Download the CSV file when ready (usually within 24 hours)</p>
          <p>5. Upload the CSV file below</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadSampleCSV}
          className="mt-3"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Sample CSV Format
        </Button>
      </div>

      {/* File Upload - Streamlined */}
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,application/csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="font-medium text-gray-700 mb-1">
              {selectedFile ? selectedFile.name : 'Choose CSV file'}
            </p>
            <p className="text-sm text-gray-500">
              Click to browse or drag and drop your LinkedIn CSV file
            </p>
            {selectedFile && (
              <p className="text-xs text-gray-400 mt-2">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            )}
          </label>
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{progressMessage}</span>
              <div className="flex items-center space-x-2">
                {uploadStartTime && (
                  <>
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-500">{getElapsedTime()}</span>
                  </>
                )}
              </div>
            </div>
            <Progress value={uploadProgress} className="w-full" />
            <div className="text-xs text-gray-500 text-center">
              {uploadProgress < 100 ? `${Math.round(uploadProgress)}% complete` : 'Finalizing...'}
            </div>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="w-full"
          size="lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {progressMessage || 'Importing Contacts...'}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Import Contacts from CSV
            </>
          )}
        </Button>
      </div>

      {/* Results - Enhanced */}
      {importResult && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Import Successful!</span>
            </div>
            {uploadStartTime && (
              <div className="text-xs text-green-600 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Completed in {getElapsedTime()}</span>
              </div>
            )}
          </div>
          <div className="text-sm text-green-700 space-y-1">
            <p>✅ Successfully imported <strong>{importResult.imported}</strong> contacts</p>
            <p>📊 Total rows processed: <strong>{importResult.total}</strong></p>
            {selectedFile && (
              <p className="flex items-center space-x-1">
                <ExternalLink className="w-3 h-3" />
                <span>Source file:
                  <button
                    onClick={() => alert(`File: ${selectedFile.name}\nSize: ${(selectedFile.size / 1024).toFixed(1)} KB\nType: ${selectedFile.type || 'text/csv'}\nLast modified: ${new Date(selectedFile.lastModified).toLocaleString()}`)}
                    className="text-green-800 underline hover:text-green-900 ml-1"
                  >
                    {selectedFile.name}
                  </button>
                </span>
              </p>
            )}
            {importResult.errors && importResult.errors.length > 0 && (
              <details className="mt-2">
                <summary className="font-medium cursor-pointer">⚠️ View warnings ({importResult.errors.length})</summary>
                <ul className="list-disc list-inside ml-4 text-xs mt-1 space-y-1 max-h-32 overflow-y-auto">
                  {importResult.errors.slice(0, 10).map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                  {importResult.errors.length > 10 && (
                    <li>... and {importResult.errors.length - 10} more</li>
                  )}
                </ul>
              </details>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-green-200 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={resetUpload}
              className="text-green-700 border-green-300 hover:bg-green-100"
            >
              Import Another File
            </Button>
            {importResult.imported > 0 && (
              <span className="text-xs text-green-600">
                🎉 {importResult.imported} new contacts added to your network!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer - Minimal */}
      <div className="text-xs text-gray-500 flex items-center justify-center space-x-4">
        <span>🔒 Secure processing</span>
        <span>📱 LinkedIn format supported</span>
        <span>🚫 Duplicates skipped</span>
      </div>
    </div>
  );
};