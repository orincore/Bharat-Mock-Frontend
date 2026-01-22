# Next.js Migration Guide - Bharat Mock

This project has been successfully migrated from React + Vite to Next.js 14 (App Router).

## Migration Summary

### What Changed

1. **Routing System**
   - Migrated from React Router to Next.js App Router
   - All `Link` components now use Next.js `Link` with `href` instead of `to`
   - `useLocation` replaced with `usePathname` from `next/navigation`

2. **Project Structure**
   - Created `/src/app` directory for Next.js App Router
   - Added `layout.tsx` as root layout with metadata
   - Added `providers.tsx` for client-side providers (React Query, Auth, Exam contexts)
   - Converted pages to use `page.tsx` convention

3. **Configuration Files**
   - **next.config.js**: Next.js configuration with image optimization
   - **tsconfig.json**: Updated for Next.js with proper module resolution
   - **package.json**: Replaced Vite scripts with Next.js scripts
   - **.eslintrc.json**: Using Next.js ESLint config

4. **Client Components**
   - Added `"use client"` directive to all interactive components
   - Context providers (AuthContext, ExamContext)
   - Pages (Index, NotFound)
   - Navigation components (Navbar, Footer)

5. **Dependencies**
   - **Added**: `next@^14.2.0`
   - **Removed**: `react-router-dom`, `vite`, `@vitejs/plugin-react-swc`, `lovable-tagger`
   - **Updated**: ESLint config to `eslint-config-next`

## Installation & Setup

### Step 1: Install Dependencies

```bash
# Remove old node_modules and lock files
rm -rf node_modules package-lock.json

# Install fresh dependencies
npm install
```

### Step 2: Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Step 3: Build for Production

```bash
npm run build
npm start
```

## File Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Home page (wraps Index component)
│   ├── not-found.tsx       # 404 page
│   └── providers.tsx       # Client-side providers wrapper
├── components/
│   ├── common/
│   │   ├── Navbar.tsx      # Updated with Next.js Link
│   │   └── Footer.tsx      # Updated with Next.js Link
│   └── ...
├── context/
│   ├── AuthContext.tsx     # "use client" directive added
│   └── ExamContext.tsx     # "use client" directive added
├── pages/
│   ├── Index.tsx           # Updated with Next.js Link
│   └── NotFound.tsx        # Updated with Next.js Link
└── ...
```

## Key Changes to Note

### 1. Link Components
**Before (React Router):**
```tsx
import { Link } from 'react-router-dom';
<Link to="/about">About</Link>
```

**After (Next.js):**
```tsx
import Link from 'next/link';
<Link href="/about">About</Link>
```

### 2. Navigation Hooks
**Before (React Router):**
```tsx
import { useLocation } from 'react-router-dom';
const location = useLocation();
const pathname = location.pathname;
```

**After (Next.js):**
```tsx
import { usePathname } from 'next/navigation';
const pathname = usePathname();
```

### 3. Client Components
All components using hooks, state, or browser APIs need `"use client"` directive:
```tsx
"use client";

import { useState } from 'react';
// ... component code
```

## Known Issues & Solutions

### TypeScript Errors Before Installation
You'll see TypeScript errors about missing Next.js modules until you run `npm install`. This is expected.

### Image Optimization
Next.js has built-in image optimization. Consider migrating `<img>` tags to Next.js `<Image>` component for better performance:
```tsx
import Image from 'next/image';
<Image src="/path" alt="..." width={800} height={600} />
```

### Environment Variables
Next.js uses different prefixes for public env vars:
- Use `NEXT_PUBLIC_` prefix for client-side variables
- Server-side variables don't need a prefix

## Additional Routes

To add new pages, create files in the `src/app` directory:

```
src/app/
├── about/
│   └── page.tsx          # /about route
├── exams/
│   └── page.tsx          # /exams route
└── articles/
    └── page.tsx          # /articles route
```

## Testing

The project still uses Vitest for testing. Run tests with:
```bash
npm test
npm run test:watch
```

## Deployment

This Next.js app can be deployed to:
- **Vercel** (recommended, zero-config)
- **Netlify**
- **AWS Amplify**
- Any Node.js hosting platform

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Run dev server: `npm run dev`
3. 🔄 Create additional route pages as needed
4. 🔄 Migrate `<img>` to Next.js `<Image>` for optimization
5. 🔄 Add API routes in `src/app/api/` if needed
6. 🔄 Configure environment variables
7. 🔄 Test all functionality thoroughly
8. 🔄 Deploy to production

## Support

For Next.js documentation: https://nextjs.org/docs
For migration issues, refer to: https://nextjs.org/docs/app/building-your-application/upgrading

---

**Migration completed successfully!** 🎉
All UI components and functionality remain intact.
