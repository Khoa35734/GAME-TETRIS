# Feedback System Implementation Summary

## Overview
Complete feedback system allowing players to submit feedback, complaints, and reports directly from the game menu.

## Components Added

### 1. Database Schema
**File:** `server/migrations/004_create_feedbacks_table.sql`

**Table Structure:**
```sql
CREATE TABLE feedbacks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('feedback','complaint','report')),
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    reported_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reported_username VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_feedbacks_user_id` - For user's feedback history
- `idx_feedbacks_type` - For filtering by type
- `idx_feedbacks_status` - For admin filtering
- `idx_feedbacks_reported_user` - For finding reports about specific users
- `idx_feedbacks_created_at` - For sorting by date

**Features:**
- Automatic `updated_at` trigger
- Foreign key constraints with cascade delete
- Type and status validation via CHECK constraints

### 2. Backend API
**File:** `server/src/routes/feedback.ts`

**Endpoints:**

#### POST /api/feedback
Submit new feedback/complaint/report
```typescript
Request Body: {
  userId: number;
  feedbackType: 'feedback' | 'complaint' | 'report';
  category: string;
  subject: string;
  description: string;
  reportedUserId?: number;  // Required for type='report'
  reportedUsername?: string; // Required for type='report'
}

Response: {
  message: string;
  feedbackId: number;
}
```

**Validation:**
- All required fields must be present
- Report type requires `reportedUserId` and `reportedUsername`
- Subject max 255 characters
- Category and type validated against allowed values

#### GET /api/feedback/user/:userId
Get user's feedback history (newest first)
```typescript
Response: {
  feedbacks: Array<{
    id: number;
    feedback_type: string;
    category: string;
    subject: string;
    description: string;
    reported_user_id: number | null;
    reported_username: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  }>
}
```

#### GET /api/feedback/admin
Get all feedback for admin panel (newest first)
```typescript
Query Params:
  ?status=pending|reviewed|resolved|dismissed
  ?type=feedback|complaint|report

Response: Same format as user endpoint
```

#### PATCH /api/feedback/:id/status
Update feedback status (admin only)
```typescript
Request Body: {
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
}

Response: {
  message: string;
}
```

### 3. Frontend Modal
**File:** `client/src/components/FeedbackModal.tsx`

**Features:**
- Three feedback types with icons:
  - 💡 Feedback (general suggestions)
  - ⚠️ Complaint (issues/bugs)
  - 🚨 Report (player misconduct)
  
- Dynamic category dropdowns based on type:
  - **Feedback:** Gameplay, UI/UX, Features, Performance, Other
  - **Complaint:** Bug, Connection, Balance, Matchmaking, Other
  - **Report:** Cheating, Toxic Behavior, Inappropriate Name, AFK/Griefing, Other

- Conditional fields:
  - Report type shows "Reported Username" input field
  - Subject and Description required for all types

- State management:
  - Loading state during submission
  - Success message with 2-second auto-close
  - Error handling with user-friendly messages
  - Form reset after successful submission

**UI Styling:**
- Dark theme matching game aesthetic
- Color-coded type selection (blue/yellow/red)
- Hover effects and smooth transitions
- Responsive textarea with character guidance
- Visual feedback for all interactions

### 4. Menu Integration
**File:** `client/src/components/menu/HomeMenu.tsx`

**Changes:**
1. Added `FeedbackModal` import
2. Added `showFeedback` state
3. Created feedback button in top navigation bar:
   - Icon: 💬
   - Label: "Feedback"
   - Color: Blue theme (#42a5f5)
   - Position: Between "Bảng xếp hạng" and "Settings" buttons
4. Rendered modal conditionally based on `showFeedback` state

**Button Style:**
- Matches existing button pattern
- Hover effects (lift + glow)
- Smooth transitions
- Consistent spacing

### 5. Migration Script
**File:** `server/src/scripts/init-feedback-table.ts`

**Purpose:** Automates feedback table creation

**Features:**
- Database connection validation
- SQL migration execution
- Table existence verification
- Column structure display
- Error handling with exit codes

**Usage:**
```bash
npm run db:feedback
```

(Note: Script needs to be added to package.json scripts)

## Database Migration Steps

### Option 1: Using psql (Direct)
```bash
cd server/migrations
psql -U devuser -d tetris -f 004_create_feedbacks_table.sql
```

### Option 2: Using Node Script
```bash
cd server
npm run db:feedback
```

### Option 3: Manual SQL (if psql unavailable)
1. Connect to PostgreSQL database `tetris`
2. Copy SQL from `server/migrations/004_create_feedbacks_table.sql`
3. Execute in database client (pgAdmin, DBeaver, etc.)

## Testing Checklist

### Frontend Testing
- [ ] Feedback button appears in HomeMenu top bar
- [ ] Modal opens when clicking feedback button
- [ ] All three type options are selectable
- [ ] Category dropdown updates based on type
- [ ] "Reported Username" field appears only for reports
- [ ] Form validation works (required fields)
- [ ] Submit button shows loading state
- [ ] Success message appears after submission
- [ ] Modal auto-closes after success
- [ ] Form resets after submission
- [ ] Error messages display correctly
- [ ] Modal can be closed via X button
- [ ] Modal can be closed via backdrop click

### Backend Testing
- [ ] POST /api/feedback creates database record
- [ ] Feedback type validation works
- [ ] Report type requires reported user fields
- [ ] GET /api/feedback/user/:userId returns user's feedback
- [ ] GET /api/feedback/admin returns all feedback
- [ ] Status filter works on admin endpoint
- [ ] Type filter works on admin endpoint
- [ ] PATCH /api/feedback/:id/status updates status
- [ ] Database foreign keys work correctly
- [ ] Timestamps update automatically

### Database Testing
```sql
-- Verify table exists
SELECT * FROM information_schema.tables WHERE table_name = 'feedbacks';

-- Check structure
\d feedbacks

-- Test insert
INSERT INTO feedbacks (user_id, feedback_type, category, subject, description)
VALUES (1, 'feedback', 'Gameplay', 'Test Subject', 'Test Description');

-- Verify indexes
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'feedbacks';

-- Test trigger
UPDATE feedbacks SET status = 'reviewed' WHERE id = 1;
SELECT updated_at FROM feedbacks WHERE id = 1; -- Should be current time
```

## API Usage Examples

### Submit Feedback
```typescript
import axios from 'axios';

const submitFeedback = async () => {
  const response = await axios.post('/api/feedback', {
    userId: 123,
    feedbackType: 'feedback',
    category: 'Gameplay',
    subject: 'Great game!',
    description: 'Love the new features, especially the BO3 mode.'
  });
  console.log('Feedback ID:', response.data.feedbackId);
};
```

### Submit Report
```typescript
const submitReport = async () => {
  const response = await axios.post('/api/feedback', {
    userId: 123,
    feedbackType: 'report',
    category: 'Cheating',
    subject: 'Suspected cheater',
    description: 'Player was clearing lines impossibly fast.',
    reportedUserId: 456,
    reportedUsername: 'suspicious_player'
  });
};
```

### Get User Feedback History
```typescript
const getUserFeedback = async (userId: number) => {
  const response = await axios.get(`/api/feedback/user/${userId}`);
  console.log('User feedbacks:', response.data.feedbacks);
};
```

### Admin: Get All Reports
```typescript
const getReports = async () => {
  const response = await axios.get('/api/feedback/admin?type=report&status=pending');
  console.log('Pending reports:', response.data.feedbacks);
};
```

### Update Feedback Status
```typescript
const updateStatus = async (feedbackId: number) => {
  await axios.patch(`/api/feedback/${feedbackId}/status`, {
    status: 'resolved'
  });
};
```

## File Summary

### Created Files
1. `server/migrations/004_create_feedbacks_table.sql` - Database schema (40 lines)
2. `server/src/routes/feedback.ts` - REST API endpoints (260 lines)
3. `client/src/components/FeedbackModal.tsx` - UI component (440 lines)
4. `server/src/scripts/init-feedback-table.ts` - Migration script (50 lines)

### Modified Files
1. `server/src/routes/index.ts` - Added feedback router import and mount
2. `client/src/components/menu/HomeMenu.tsx` - Added feedback button and modal

**Total:** 4 new files, 2 modified files (~790 lines of new code)

## Future Enhancements

### Potential Features
1. **Admin Panel UI**
   - View all feedback in dedicated admin interface
   - Filter by type, status, date range
   - Bulk status updates
   - Response/comment system

2. **Email Notifications**
   - Notify admins of new reports
   - Notify users when their feedback is reviewed

3. **Attachment Support**
   - Allow screenshot uploads with reports
   - Store in cloud storage (S3, Cloudinary)

4. **Analytics Dashboard**
   - Track feedback trends
   - Category distribution charts
   - Response time metrics

5. **User Feedback History**
   - Show in profile modal
   - Status tracking
   - Response viewing

6. **Rate Limiting**
   - Prevent spam submissions
   - Cooldown period between reports

## Architecture Notes

### Design Decisions
1. **Single Table Design:** All feedback types in one table for simplicity
2. **Type Validation:** CHECK constraints ensure data integrity at DB level
3. **Soft Dependencies:** `reported_user_id` uses SET NULL on delete (preserves report)
4. **Status Workflow:** pending → reviewed → resolved/dismissed
5. **Timestamps:** Automatic via trigger, no application logic needed
6. **Indexes:** Covering common query patterns (user history, admin filtering)

### Security Considerations
1. **User ID Validation:** Should verify userId matches authenticated user in production
2. **Admin Endpoints:** Need authentication middleware (not implemented yet)
3. **Rate Limiting:** Should add to prevent abuse
4. **Input Sanitization:** SQL injection prevented by parameterized queries
5. **XSS Prevention:** Frontend should sanitize displayed feedback text

### Performance Notes
- Indexes on `user_id`, `status`, `type`, `created_at` for fast queries
- `REFERENCES users(id) ON DELETE CASCADE` auto-cleans orphaned feedback
- Pagination should be added to admin endpoint for large datasets

## Troubleshooting

### Migration Fails
**Error:** `relation "users" does not exist`
**Solution:** Run base migrations first (`001_create_account_table.sql`, `002_rename_account_to_users.sql`)

### API Returns 500
**Check:**
1. Database connection (`npm run db:ping`)
2. Table exists (`SELECT * FROM feedbacks LIMIT 1;`)
3. Server logs for SQL errors

### Modal Doesn't Open
**Check:**
1. FeedbackModal import in HomeMenu
2. `showFeedback` state exists
3. Button onClick handler
4. Console for React errors

### Form Submission Fails
**Common Issues:**
- Missing required fields (check validation)
- userId not found in localStorage
- Network error (check API_BASE_URL)
- Report type missing reported user fields

## Maintenance

### Regular Tasks
- Monitor feedback table size, archive old resolved items
- Review response times to user feedback
- Update categories based on recurring themes
- Clean up spam/duplicate reports

### Database Maintenance
```sql
-- Archive old resolved feedback (older than 6 months)
DELETE FROM feedbacks 
WHERE status IN ('resolved', 'dismissed') 
AND updated_at < NOW() - INTERVAL '6 months';

-- Find most common categories
SELECT category, feedback_type, COUNT(*) as count
FROM feedbacks
GROUP BY category, feedback_type
ORDER BY count DESC;

-- Active reports by user
SELECT reported_username, COUNT(*) as report_count
FROM feedbacks
WHERE feedback_type = 'report' AND status = 'pending'
GROUP BY reported_username
ORDER BY report_count DESC;
```

---

**Status:** ✅ Complete - Ready for testing
**Next Steps:** Run migration, test submission flow, implement admin panel UI
