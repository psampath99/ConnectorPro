import { User, Contact, Draft, Task, Meeting, Recommendation, Activity } from '@/types';

const STORAGE_KEYS = {
  USER: 'connectorpro_user',
  CONTACTS: 'connectorpro_contacts',
  DRAFTS: 'connectorpro_drafts',
  TASKS: 'connectorpro_tasks',
  MEETINGS: 'connectorpro_meetings',
  RECOMMENDATIONS: 'connectorpro_recommendations',
  ACTIVITIES: 'connectorpro_activities',
  // Onboarding specific keys
  CSV_UPLOADED: 'connectorpro_csv_uploaded',
  CSV_UPLOAD_RESULT: 'connectorpro_csv_upload_result',
  CSV_UPLOAD_TIMESTAMP: 'connectorpro_csv_upload_timestamp',
  CSV_UPLOADED_FILES: 'connectorpro_csv_uploaded_files',
  FILE_UPLOAD_HISTORY: 'connectorpro_file_upload_history',
  PRIMARY_GOAL: 'connectorpro_primary_goal',
  TARGET_COMPANIES: 'connectorpro_target_companies',
  LINKEDIN_PROFILE_URL: 'connectorpro_linkedin_profile_url',
  LINKEDIN_CONNECTED: 'connectorpro_linkedin_connected',
  EMAIL_CONNECTED: 'connectorpro_email_connected',
  EMAIL_PROVIDER: 'connectorpro_email_provider',
  CALENDAR_CONNECTED: 'connectorpro_calendar_connected',
  ONBOARDING_COMPLETE: 'connectorpro_onboarding_complete',
  ACCESS_TOKEN: 'accessToken'
};

export const storage = {
  // User
  getUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },
  
  setUser: (user: User): void => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  // Contacts
  getContacts: (): Contact[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    return data ? JSON.parse(data) : [];
  },
  
  setContacts: (contacts: Contact[]): void => {
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
  },

  addContact: (contact: Contact): void => {
    const contacts = storage.getContacts();
    contacts.push(contact);
    storage.setContacts(contacts);
  },

  updateContact: (id: string, updates: Partial<Contact>): void => {
    const contacts = storage.getContacts();
    const index = contacts.findIndex(c => c.id === id);
    if (index !== -1) {
      contacts[index] = { ...contacts[index], ...updates };
      storage.setContacts(contacts);
    }
  },

  deleteContact: (id: string): void => {
    const contacts = storage.getContacts();
    const filtered = contacts.filter(c => c.id !== id);
    storage.setContacts(filtered);
  },


  // Drafts
  getDrafts: (): Draft[] => {
    const data = localStorage.getItem(STORAGE_KEYS.DRAFTS);
    return data ? JSON.parse(data) : [];
  },
  
  setDrafts: (drafts: Draft[]): void => {
    localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));
  },

  addDraft: (draft: Draft): void => {
    const drafts = storage.getDrafts();
    drafts.push(draft);
    storage.setDrafts(drafts);
  },

  updateDraft: (id: string, updates: Partial<Draft>): void => {
    const drafts = storage.getDrafts();
    const index = drafts.findIndex(d => d.id === id);
    if (index !== -1) {
      drafts[index] = { ...drafts[index], ...updates };
      storage.setDrafts(drafts);
    }
  },

  deleteDraft: (id: string): void => {
    const drafts = storage.getDrafts();
    const filtered = drafts.filter(d => d.id !== id);
    storage.setDrafts(filtered);
  },

  // Tasks
  getTasks: (): Task[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TASKS);
    return data ? JSON.parse(data) : [];
  },
  
  setTasks: (tasks: Task[]): void => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  },

  addTask: (task: Task): void => {
    const tasks = storage.getTasks();
    tasks.push(task);
    storage.setTasks(tasks);
  },

  updateTask: (id: string, updates: Partial<Task>): void => {
    const tasks = storage.getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates };
      storage.setTasks(tasks);
    }
  },

  // Meetings
  getMeetings: (): Meeting[] => {
    const data = localStorage.getItem(STORAGE_KEYS.MEETINGS);
    return data ? JSON.parse(data) : [];
  },
  
  setMeetings: (meetings: Meeting[]): void => {
    localStorage.setItem(STORAGE_KEYS.MEETINGS, JSON.stringify(meetings));
  },

  addMeeting: (meeting: Meeting): void => {
    const meetings = storage.getMeetings();
    meetings.push(meeting);
    storage.setMeetings(meetings);
  },

  updateMeeting: (id: string, updates: Partial<Meeting>): void => {
    const meetings = storage.getMeetings();
    const index = meetings.findIndex(m => m.id === id);
    if (index !== -1) {
      meetings[index] = { ...meetings[index], ...updates };
      storage.setMeetings(meetings);
    }
  },

  // Recommendations
  getRecommendations: (): Recommendation[] => {
    const data = localStorage.getItem(STORAGE_KEYS.RECOMMENDATIONS);
    return data ? JSON.parse(data) : [];
  },
  
  setRecommendations: (recommendations: Recommendation[]): void => {
    localStorage.setItem(STORAGE_KEYS.RECOMMENDATIONS, JSON.stringify(recommendations));
  },

  // Activities
  getActivities: (): Activity[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    return data ? JSON.parse(data) : [];
  },
  
  setActivities: (activities: Activity[]): void => {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  },

  addActivity: (activity: Activity): void => {
    const activities = storage.getActivities();
    activities.unshift(activity); // Add to beginning for chronological order
    storage.setActivities(activities);
  },

  // Initialize with mock data
  initializeMockData: (mockData: {
    user: User;
    contacts: Contact[];
    recommendations: Recommendation[];
    drafts: Draft[];
    tasks: Task[];
    meetings: Meeting[];
    activities: Activity[];
  }): void => {
    if (!storage.getUser()) {
      storage.setUser(mockData.user);
    }
    if (storage.getContacts().length === 0) {
      storage.setContacts(mockData.contacts);
    }
    if (storage.getRecommendations().length === 0) {
      storage.setRecommendations(mockData.recommendations);
    }
    if (storage.getDrafts().length === 0) {
      storage.setDrafts(mockData.drafts);
    }
    if (storage.getTasks().length === 0) {
      storage.setTasks(mockData.tasks);
    }
    if (storage.getMeetings().length === 0) {
      storage.setMeetings(mockData.meetings);
    }
    if (storage.getActivities().length === 0) {
      storage.setActivities(mockData.activities);
    }
  },

  // Onboarding specific functions
  getCsvUploadState: () => {
    const csvUploaded = localStorage.getItem(STORAGE_KEYS.CSV_UPLOADED) === 'true';
    const csvImportResult = localStorage.getItem(STORAGE_KEYS.CSV_UPLOAD_RESULT);
    const csvUploadTimestamp = localStorage.getItem(STORAGE_KEYS.CSV_UPLOAD_TIMESTAMP);
    
    let parsedResult = null;
    if (csvImportResult) {
      try {
        parsedResult = JSON.parse(csvImportResult);
      } catch (error) {
        console.error('Error parsing CSV import result:', error);
        parsedResult = null;
      }
    }
    
    return {
      csvUploaded,
      csvImportResult: parsedResult,
      csvUploadTimestamp
    };
  },

  setCsvUploadState: (result: any, fileName?: string) => {
    const resultWithFilename = fileName ? { ...result, fileName } : result;
    localStorage.setItem(STORAGE_KEYS.CSV_UPLOAD_RESULT, JSON.stringify(resultWithFilename));
    localStorage.setItem(STORAGE_KEYS.CSV_UPLOADED, 'true');
    localStorage.setItem(STORAGE_KEYS.CSV_UPLOAD_TIMESTAMP, new Date().toISOString());
  },

  // Enhanced file management
  getUploadedFiles: () => {
    const data = localStorage.getItem(STORAGE_KEYS.CSV_UPLOADED_FILES);
    if (!data) return [];
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing uploaded files:', error);
      return [];
    }
  },

  setUploadedFiles: (files: any[]) => {
    localStorage.setItem(STORAGE_KEYS.CSV_UPLOADED_FILES, JSON.stringify(files));
  },

  addUploadedFile: (file: any) => {
    const files = storage.getUploadedFiles();
    files.push(file);
    storage.setUploadedFiles(files);
  },

  removeUploadedFile: (fileId: string) => {
    const files = storage.getUploadedFiles();
    const filtered = files.filter((f: any) => f.id !== fileId);
    storage.setUploadedFiles(filtered);
  },

  clearCsvUploadState: () => {
    localStorage.removeItem(STORAGE_KEYS.CSV_UPLOADED);
    localStorage.removeItem(STORAGE_KEYS.CSV_UPLOAD_RESULT);
    localStorage.removeItem(STORAGE_KEYS.CSV_UPLOAD_TIMESTAMP);
  },

  getOnboardingData: () => {
    let targetCompanies = [];
    const targetCompaniesData = localStorage.getItem(STORAGE_KEYS.TARGET_COMPANIES);
    if (targetCompaniesData) {
      try {
        targetCompanies = JSON.parse(targetCompaniesData);
      } catch (error) {
        console.error('Error parsing target companies:', error);
        targetCompanies = [];
      }
    }

    return {
      primaryGoal: localStorage.getItem(STORAGE_KEYS.PRIMARY_GOAL),
      targetCompanies,
      linkedinProfileUrl: localStorage.getItem(STORAGE_KEYS.LINKEDIN_PROFILE_URL),
      linkedinConnected: localStorage.getItem(STORAGE_KEYS.LINKEDIN_CONNECTED) === 'true',
      emailConnected: localStorage.getItem(STORAGE_KEYS.EMAIL_CONNECTED) === 'true',
      emailProvider: localStorage.getItem(STORAGE_KEYS.EMAIL_PROVIDER),
      calendarConnected: localStorage.getItem(STORAGE_KEYS.CALENDAR_CONNECTED) === 'true',
      onboardingComplete: localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE) === 'true',
      ...storage.getCsvUploadState()
    };
  },

  setOnboardingData: (data: any, emailProvider: string) => {
    localStorage.setItem(STORAGE_KEYS.PRIMARY_GOAL, data.primaryGoal);
    localStorage.setItem(STORAGE_KEYS.TARGET_COMPANIES, JSON.stringify(data.targetCompanies));
    localStorage.setItem(STORAGE_KEYS.LINKEDIN_PROFILE_URL, data.linkedinProfileUrl);
    localStorage.setItem(STORAGE_KEYS.LINKEDIN_CONNECTED, data.linkedinConnected.toString());
    localStorage.setItem(STORAGE_KEYS.CSV_UPLOADED, data.csvUploaded.toString());
    localStorage.setItem(STORAGE_KEYS.EMAIL_CONNECTED, data.emailConnected.toString());
    localStorage.setItem(STORAGE_KEYS.EMAIL_PROVIDER, emailProvider);
    localStorage.setItem(STORAGE_KEYS.CALENDAR_CONNECTED, data.calendarConnected.toString());
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
  },

  getAccessToken: () => {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  // File Upload History
  getFileUploadHistory: () => {
    const data = localStorage.getItem(STORAGE_KEYS.FILE_UPLOAD_HISTORY);
    if (!data) return [];
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing file upload history:', error);
      return [];
    }
  },

  setFileUploadHistory: (history: any[]) => {
    localStorage.setItem(STORAGE_KEYS.FILE_UPLOAD_HISTORY, JSON.stringify(history));
  },

  addFileUploadRecord: (uploadRecord: {
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
    metadata?: any;
  }) => {
    const history = storage.getFileUploadHistory();
    
    // Add new upload to the beginning (newest first)
    history.unshift(uploadRecord);
    
    // Enforce maximum of 5 uploads - automatically prune older ones
    if (history.length > 5) {
      history.splice(5); // Keep only the first 5 (newest)
    }
    
    storage.setFileUploadHistory(history);
  },

  removeFileUploadRecord: (uploadId: string) => {
    const history = storage.getFileUploadHistory();
    const filtered = history.filter((record: any) => record.id !== uploadId);
    storage.setFileUploadHistory(filtered);
  },

  updateFileUploadRecord: (uploadId: string, updates: any) => {
    const history = storage.getFileUploadHistory();
    const index = history.findIndex((record: any) => record.id === uploadId);
    if (index !== -1) {
      history[index] = { ...history[index], ...updates, updatedAt: new Date().toISOString() };
      storage.setFileUploadHistory(history);
    }
  }
};