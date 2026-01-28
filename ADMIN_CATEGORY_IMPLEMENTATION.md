# Admin Category Management Implementation Guide

## Overview
Complete admin system for managing category content with full-page forms instead of modals.

## Database Schema
**File**: `/migrations/20260126_category_content_sections.sql`

### Tables Created:
1. **category_notifications** - Exam notifications, results, admit cards
2. **category_syllabus** - Subject-wise syllabus
3. **category_syllabus_topics** - Topics under each subject
4. **category_cutoffs** - Previous year cutoff marks
5. **category_important_dates** - Important dates and deadlines
6. **category_preparation_tips** - Preparation strategies
7. **category_articles** - Junction table linking articles to categories

## Frontend Structure

### Routes:
- `/admin/categories` - List all categories (✅ COMPLETED)
- `/admin/categories/create` - Create new category (PENDING)
- `/admin/categories/[id]` - Manage category with all sections (PENDING)

### Category Management Page Features:
1. **Basic Info Tab** - Edit category name, description, logo, slug
2. **Exams Tab** - Link/unlink exams to category
3. **Notifications Tab** - Add/edit/delete notifications
4. **Syllabus Tab** - Manage subjects and topics
5. **Cutoffs Tab** - Add/edit/delete cutoff data
6. **Important Dates Tab** - Manage timeline events
7. **Preparation Tips Tab** - Add/edit/delete tips
8. **Articles Tab** - Link articles to category

## Backend API Endpoints Needed

### Category Content APIs:
```
POST   /api/v1/taxonomy/categories/:id/notifications
GET    /api/v1/taxonomy/categories/:id/notifications
PUT    /api/v1/taxonomy/categories/:id/notifications/:notificationId
DELETE /api/v1/taxonomy/categories/:id/notifications/:notificationId

POST   /api/v1/taxonomy/categories/:id/syllabus
GET    /api/v1/taxonomy/categories/:id/syllabus
PUT    /api/v1/taxonomy/categories/:id/syllabus/:syllabusId
DELETE /api/v1/taxonomy/categories/:id/syllabus/:syllabusId

POST   /api/v1/taxonomy/categories/:id/cutoffs
GET    /api/v1/taxonomy/categories/:id/cutoffs
PUT    /api/v1/taxonomy/categories/:id/cutoffs/:cutoffId
DELETE /api/v1/taxonomy/categories/:id/cutoffs/:cutoffId

POST   /api/v1/taxonomy/categories/:id/dates
GET    /api/v1/taxonomy/categories/:id/dates
PUT    /api/v1/taxonomy/categories/:id/dates/:dateId
DELETE /api/v1/taxonomy/categories/:id/dates/:dateId

POST   /api/v1/taxonomy/categories/:id/tips
GET    /api/v1/taxonomy/categories/:id/tips
PUT    /api/v1/taxonomy/categories/:id/tips/:tipId
DELETE /api/v1/taxonomy/categories/:id/tips/:tipId

POST   /api/v1/taxonomy/categories/:id/articles
DELETE /api/v1/taxonomy/categories/:id/articles/:articleId
```

## Implementation Steps

### Step 1: Run Database Migration ✅
```bash
psql -U your_user -d your_database -f migrations/20260126_category_content_sections.sql
```

### Step 2: Create Backend Controllers & Routes
- Create `categoryContentController.js`
- Add routes to `taxonomyRoutes.js`
- Implement CRUD operations for each section

### Step 3: Build Frontend Pages
- Create `/admin/categories/create/page.tsx`
- Create `/admin/categories/[id]/page.tsx` with tabbed interface
- Build section-specific components

### Step 4: Testing
- Test all CRUD operations
- Verify data persistence
- Check permissions and validation

## Next Actions
1. Apply database migration SQL
2. Create backend API endpoints
3. Build full-page category management UI
4. Test complete workflow
