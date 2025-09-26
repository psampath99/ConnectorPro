# UI/UX Improvement Plan

## 1. File & Component Audit

### 1.1. Pages

The following pages will need to be reviewed to ensure the new color scheme is applied correctly:

-   `frontend/src/pages/Assistant.tsx`
-   `frontend/src/pages/CalendarCallback.tsx`
-   `frontend/src/pages/Contacts.tsx`
-   `frontend/src/pages/Drafts.tsx`
-   `frontend/src/pages/Feed.tsx`
-   `frontend/src/pages/Index.tsx`
-   `frontend/src/pages/Meetings.tsx`
-   `frontend/src/pages/Messages.tsx`
-   `frontend/src/pages/Network.tsx`
-   `frontend/src/pages/NotFound.tsx`
-   `frontend/src/pages/Settings.tsx`
-   `frontend/src/pages/Tasks.tsx`

### 1.2. Key Reusable Components

The following reusable components will be directly affected by the color scheme changes:

-   `frontend/src/components/assistant/ChatInterface.tsx`
-   `frontend/src/components/dashboard/Dashboard.tsx`
-   `frontend/src/components/dashboard/RecommendationCard.tsx`
-   `frontend/src/components/integrations/CalendarIntegration.tsx`
-   `frontend/src/components/integrations/CSVImport.tsx`
-   `frontend/src/components/integrations/FileUploadHistory.tsx`
-   `frontend/src/components/integrations/GmailIntegration.tsx`
-   `frontend/src/components/integrations/LinkedInIntegration.tsx`
-   `frontend/src/components/layout/MainLayout.tsx`
-   `frontend/src/components/layout/Sidebar.tsx`
-   `frontend/src/components/modals/TargetCompaniesModal.tsx`
-   `frontend/src/components/network/NetworkQueryInterface.tsx`
-   `frontend/src/components/onboarding/OnboardingFlow.tsx`

The UI components in `frontend/src/components/ui/` will also be updated automatically as they are built on top of the core styling.

### 1.3. Files to Modify

The following files will need to be modified to implement the new color scheme:

-   `frontend/src/globals.css`: This file contains the core CSS variables for the color scheme.
-   `frontend/tailwind.config.ts`: This file configures Tailwind CSS to use the CSS variables.
-   All component and page files listed above may require minor adjustments to ensure the new theme is applied correctly.

## 2. Color Scheme Proposal

### 2.1. New Color Palette

The new color palette will be based on a modern, accessible blue primary color.

-   **Primary:** A vibrant blue for interactive elements.
-   **Secondary:** A neutral gray for secondary text and borders.
-   **Background:** A light gray for the main background.
-   **Card/Popover:** White for card and popover backgrounds.
-   **Destructive:** A red for destructive actions.
-   **Success:** A green for success states.
-   **Warning:** An orange for warning states.

### 2.2. New CSS Variable Values

The following values will be updated in `frontend/src/globals.css`:

#### Light Mode

```css
:root {
  --background: 240 5.9% 90%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 20% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 10% 3.9%;
  --radius: 0.5rem;
  --success: 142.1 76.2% 36.3%;
  --warning: 47.9 95.8% 53.1%;
}
```

#### Dark Mode

```css
.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 3.9%;
  --card-foreground: 0 0% 98%;
  --popover: 240 10% 3.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 20% 98%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 85.7% 97.3%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 221.2 83.2% 53.3%;
  --success: 142.1 76.2% 36.3%;
  --warning: 47.9 95.8% 53.1%;
}
```

## 3. Implementation Strategy

1.  **Update `frontend/src/globals.css`:** Replace the existing `:root` and `.dark` color definitions with the new values.
2.  **Verify `frontend/tailwind.config.ts`:** Ensure that the Tailwind configuration correctly references the CSS variables. No changes should be needed here.
3.  **Review Application:** Systematically go through each page and component to ensure the new color scheme is applied correctly and there are no visual regressions.
4.  **Address Issues:** If any components do not render correctly, make the necessary adjustments in their respective files.

This plan provides a clear path to resolving the UI issues and implementing a more visually appealing and user-friendly design.