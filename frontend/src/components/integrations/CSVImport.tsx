import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';

interface CSVImportProps {
  onContactsImported?: (contacts: any[]) => void;
}

export const CSVImport = ({ onContactsImported }: CSVImportProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      const validExtensions = ['.csv', '.numbers', '.xlsx', '.xls'];
      const validMimeTypes = [
        'text/csv',
        'application/vnd.apple.numbers',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
      const hasValidMimeType = validMimeTypes.includes(file.type);
      
      if (!hasValidExtension && !hasValidMimeType) {
        setError('Please select a valid CSV, Numbers, or Excel file');
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

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:8000/api/v1/contacts/import/csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to import CSV');
      }

      const result = await response.json();
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
      if (result.contacts && result.contacts.length > 0) {
        const formattedContacts = result.contacts.map((contact: any) => ({
          id: contact._id,
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
          addedAt: new Date(contact.addedAt),
          linkedinData: contact.linkedinData || {}
        }));
        
        // Add to existing contacts in localStorage
        const existingContacts = storage.getContacts();
        const allContacts = [...existingContacts, ...formattedContacts];
        storage.setContacts(allContacts);
        
        console.log(`Saved ${formattedContacts.length} contacts to localStorage for dashboard display`);
      }
      
      if (onContactsImported) {
        onContactsImported(result.contacts);
      }

      // Clear the file input
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import CSV file';
      setError(errorMessage);
      
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
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['First Name', 'Last Name', 'Email Address', 'Company', 'Position', 'Connected On', 'Profile URL'],
      ['John', 'Doe', 'john.doe@example.com', 'Tech Corp', 'Software Engineer', '2023-01-15', 'https://linkedin.com/in/johndoe'],
      ['Jane', 'Smith', 'jane.smith@example.com', 'Design Studio', 'UX Designer', '2023-02-20', 'https://linkedin.com/in/janesmith'],
      ['Mike', 'Johnson', 'mike.johnson@example.com', 'Marketing Inc', 'Marketing Manager', '2023-03-10', 'https://linkedin.com/in/mikejohnson']
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linkedin_contacts_sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-6 h-6 text-green-600" />
          <span>CSV Import</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How to get your LinkedIn CSV</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Go to LinkedIn → Settings & Privacy → Data Privacy</li>
              <li>Click "Get a copy of your data"</li>
              <li>Select "Connections" and request your data</li>
              <li>Download the CSV file when ready (usually within 24 hours)</li>
              <li>Upload the CSV file below</li>
            </ol>
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

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.numbers,.xlsx,.xls,application/vnd.apple.numbers,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {selectedFile ? selectedFile.name : 'Choose CSV file'}
              </p>
              <p className="text-sm text-gray-500">
                Click to browse or drag and drop your LinkedIn CSV file
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Maximum file size: 5MB
              </p>
            </label>
          </div>

          {selectedFile && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-700">{selectedFile.name}</span>
                <span className="text-sm text-gray-500">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>
          )}

          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing Contacts...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Contacts from CSV
              </>
            )}
          </Button>

          {importResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Import Successful!</span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>✅ Successfully imported {importResult.imported} contacts</p>
                <p>📊 Total rows processed: {importResult.total}</p>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">⚠️ Warnings:</p>
                    <ul className="list-disc list-inside ml-4 text-xs">
                      {importResult.errors.slice(0, 5).map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>... and {importResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>🔒 Your CSV data is processed securely and files are deleted after import.</p>
          <p>📱 Supports standard LinkedIn connection export format.</p>
          <p>🚫 Duplicate contacts are automatically skipped.</p>
        </div>
      </CardContent>
    </Card>
  );
};