Client Login Portal Implementation Plan
Overview
Build an invitation-only client portal where clients can create accounts, submit change requests with categories and file attachments, view their request history, and track status updates. Email notifications will be sent when new requests are created.

Database Schema (Supabase)
Tables to create:
invitations: id, email, token, status (pending/used), created_at, expires_at, used_at
requests: id, client_id (FK to auth.users), title, category, description, status (pending/in_progress/completed), created_at, updated_at
attachments: id, request_id (FK), filename, file_url (Supabase Storage), file_size, mime_type, created_at
Storage bucket:
Create request-attachments bucket in Supabase Storage with authenticated access
Implementation Steps
1. Supabase Setup & Configuration
Install @supabase/supabase-js and @supabase/ssr packages
Create lib/supabase/client.ts for client-side Supabase instance
Create lib/supabase/server.ts for server-side Supabase instance
Create lib/supabase/middleware.ts for middleware session management
Add Supabase environment variables to .env.local:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY (server-side only)
2. Database Schema Creation
Create SQL migration file or use Supabase dashboard to create:
invitations table with proper indexes
requests table with RLS policies (clients can only see their own requests)
attachments table with RLS policies
Storage bucket and policies for file uploads
3. Invitation System
Create app/api/invitations/route.ts:
POST endpoint to create invitations (protected with admin key)
Generates unique token, stores in database
Create app/api/invitations/verify/route.ts:
GET endpoint to verify invitation token
Create lib/invitations.ts utility functions:
generateInvitationToken()
validateInvitationToken()
markInvitationAsUsed()
4. Authentication Pages
Create app/login/page.tsx:
Login form using Supabase Auth
Redirect to dashboard on success
Create app/signup/page.tsx:
Signup form with invitation token validation
Creates account via Supabase Auth
Links user to invitation record
Create app/api/auth/logout/route.ts:
POST endpoint for logout
Update lib/types.ts with auth-related types
5. Protected Routes & Middleware
Create middleware.ts in root:
Protects /dashboard and /requests/* routes
Redirects unauthenticated users to login
Create lib/auth.ts utility functions:
getServerSession()
requireAuth() helper
6. Request Management System
Create app/api/requests/route.ts:
GET: List client's requests
POST: Create new request with file uploads
Create app/api/requests/[id]/route.ts:
GET: Get single request details
Create app/api/requests/[id]/status/route.ts:
PATCH: Update request status (protected with admin key)
Create lib/requests.ts utility functions for request operations
7. File Upload System
Create app/api/upload/route.ts:
POST endpoint for file uploads
Uploads to Supabase Storage
Returns file URL
Create lib/storage.ts utility for file operations
8. Email Notification System
Install resend package (recommended for Next.js)
Create lib/email.ts:
sendNewRequestNotification() function
Email template with request details
Create app/api/notify/route.ts:
POST endpoint to send email notifications
Called after request creation
Add RESEND_API_KEY to .env.local
9. Client Dashboard UI
Create app/dashboard/page.tsx:
Protected route showing client's request history
Status indicators (pending/in_progress/completed)
Link to create new request
Create components/RequestCard.tsx:
Displays request summary with status
Create components/StatusBadge.tsx:
Visual status indicator component
10. Create Request Form
Create app/requests/new/page.tsx:
Protected route with request creation form
Category dropdown (Design, Content, Technical, Bug Fix, Other)
Description textarea
File upload component (multiple files)
Submit to API
Create components/RequestForm.tsx:
Reusable form component
Create components/FileUpload.tsx:
File upload UI with preview
Handles multiple file selection
11. Request Detail View
Create app/requests/[id]/page.tsx:
Protected route showing full request details
Displays attachments
Shows status and update history
12. Navigation Updates
Update components/Navbar.tsx:
Add "Client Portal" or "Login" button when not authenticated
Add "Dashboard" and "Logout" when authenticated
Show user email when logged in
13. Type Definitions
Update lib/types.ts with:
Invitation, Request, Attachment types
Request status and category enums
Auth session types
Files to Create/Modify
New Files:

lib/supabase/client.ts
lib/supabase/server.ts
lib/supabase/middleware.ts
lib/auth.ts
lib/invitations.ts
lib/requests.ts
lib/storage.ts
lib/email.ts
middleware.ts
app/login/page.tsx
app/signup/page.tsx
app/dashboard/page.tsx
app/requests/new/page.tsx
app/requests/[id]/page.tsx
app/api/invitations/route.ts
app/api/invitations/verify/route.ts
app/api/auth/logout/route.ts
app/api/requests/route.ts
app/api/requests/[id]/route.ts
app/api/requests/[id]/status/route.ts
app/api/upload/route.ts
app/api/notify/route.ts
components/RequestCard.tsx
components/StatusBadge.tsx
components/RequestForm.tsx
components/FileUpload.tsx
Files to Modify:

components/Navbar.tsx (add auth UI)
lib/types.ts (add new types)
package.json (add dependencies)
.env.local.example (document new env vars)
Dependencies to Add
@supabase/supabase-js
@supabase/ssr
resend (for email notifications)
Security Considerations
RLS policies on all Supabase tables (clients can only access their own data)
Admin key protection for status update endpoint
File upload size limits
Invitation token expiration (7 days default)
Secure file storage with authenticated access only
