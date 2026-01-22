# Color Theme Configuration Guide

## Overview

The Bharat Mock platform uses a centralized color theme system that allows you to update the entire website's color scheme by modifying a single file.

## Client Brand Colors

- **Primary Blue**: `#00aeef` - Used for primary actions, links, and brand elements
- **Secondary Orange**: `#f7941d` - Used for accents, CTAs, and highlights

## How to Change Colors

### Single File Update

To change the entire website's color theme, simply update the colors in:

```
/src/styles/colors.ts
```

### Example: Changing Primary Color

```typescript
export const colors = {
  primary: {
    DEFAULT: '#00aeef', // Change this to your new primary color
    light: '#33bef2',   // Lighter variant
    dark: '#0098d4',    // Darker variant
    foreground: '#ffffff',
  },
  // ... rest of colors
}
```

## Color Structure

### 1. Brand Colors

#### Primary (Blue - #00aeef)
- `primary.DEFAULT` - Main brand color
- `primary.light` - Lighter shade for hovers
- `primary.dark` - Darker shade for active states
- `primary.foreground` - Text color on primary background

#### Secondary (Orange - #f7941d)
- `secondary.DEFAULT` - Secondary brand color
- `secondary.light` - Lighter shade
- `secondary.dark` - Darker shade
- `secondary.foreground` - Text color on secondary background

### 2. Semantic Colors

#### Success (Green)
- Used for: Success messages, positive actions, pass status
- Default: `#10b981`

#### Warning (Yellow/Orange)
- Used for: Warnings, caution messages
- Default: `#f59e0b`

#### Destructive (Red)
- Used for: Errors, delete actions, fail status
- Default: `#ef4444`

#### Info (Blue)
- Used for: Information messages, tips
- Default: `#3b82f6`

### 3. Neutral Colors

#### Background
- `background.DEFAULT` - Main page background (#ffffff)
- `background.secondary` - Secondary background (#f8fafc)
- `background.tertiary` - Tertiary background (#f1f5f9)

#### Foreground
- `foreground.DEFAULT` - Main text color (#0f172a)
- `foreground.secondary` - Secondary text (#475569)
- `foreground.tertiary` - Tertiary text (#94a3b8)

#### Card
- `card.DEFAULT` - Card background (#ffffff)
- `card.foreground` - Card text color (#0f172a)

#### Muted
- `muted.DEFAULT` - Muted background (#f1f5f9)
- `muted.foreground` - Muted text (#64748b)

#### Border
- `border.DEFAULT` - Default border color (#e2e8f0)
- `border.light` - Light border (#f1f5f9)
- `border.dark` - Dark border (#cbd5e1)

### 4. Gradient Colors

#### Primary Gradient
```css
background: linear-gradient(135deg, #00aeef 0%, #0098d4 100%);
```

#### Secondary Gradient
```css
background: linear-gradient(135deg, #f7941d 0%, #de8419 100%);
```

#### Hero Gradient
```css
background: linear-gradient(135deg, #00aeef 0%, #0098d4 50%, #006b9e 100%);
```

## Usage in Components

### Using Tailwind Classes

```tsx
// Primary color
<button className="bg-primary text-primary-foreground">
  Click Me
</button>

// Secondary color
<button className="bg-secondary text-secondary-foreground">
  Learn More
</button>

// Gradient background
<div className="gradient-hero">
  Hero Section
</div>
```

### Using CSS Variables

```css
.custom-element {
  background-color: var(--color-primary);
  color: var(--color-primary-foreground);
}
```

### Direct Import

```tsx
import { colors } from '@/styles/colors';

const MyComponent = () => {
  return (
    <div style={{ backgroundColor: colors.primary.DEFAULT }}>
      Content
    </div>
  );
};
```

## Where Colors Are Used

### Primary Blue (#00aeef)
- Navigation links
- Primary buttons
- Links and anchors
- Icons and badges
- Progress indicators
- Active states
- Hero section backgrounds
- Brand elements

### Secondary Orange (#f7941d)
- Call-to-action buttons
- Accent elements
- Highlights
- Secondary badges
- Warning indicators
- Featured items

### Success Green
- Success messages
- Pass status
- Positive indicators
- Completion badges

### Warning Yellow/Orange
- Warning messages
- Caution indicators
- Medium priority items

### Destructive Red
- Error messages
- Delete buttons
- Fail status
- Critical alerts

## CSS Variables Reference

All colors are also available as CSS variables in `/src/index.css`:

```css
:root {
  /* Primary: #00aeef */
  --primary: 195 100% 47%;
  --primary-foreground: 0 0% 100%;
  
  /* Secondary: #f7941d */
  --secondary: 32 94% 54%;
  --secondary-foreground: 0 0% 100%;
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #00aeef 0%, #0098d4 100%);
  --gradient-secondary: linear-gradient(135deg, #f7941d 0%, #de8419 100%);
  --gradient-hero: linear-gradient(135deg, #00aeef 0%, #0098d4 50%, #006b9e 100%);
}
```

## Dark Mode Support

The color system includes dark mode variants. Colors automatically adjust when dark mode is enabled:

```css
.dark {
  --primary: 195 100% 55%; /* Slightly brighter in dark mode */
  --secondary: 32 94% 60%;
}
```

## Best Practices

### 1. Always Use Theme Colors
❌ **Don't do this:**
```tsx
<button style={{ backgroundColor: '#00aeef' }}>Click</button>
```

✅ **Do this:**
```tsx
<button className="bg-primary">Click</button>
```

### 2. Use Semantic Colors
❌ **Don't do this:**
```tsx
<div className="text-red-500">Error message</div>
```

✅ **Do this:**
```tsx
<div className="text-destructive">Error message</div>
```

### 3. Maintain Contrast
Always ensure sufficient contrast between text and background colors for accessibility.

### 4. Test Both Modes
When changing colors, test both light and dark modes to ensure readability.

## Quick Color Change Checklist

When updating the color theme:

1. ✅ Update `/src/styles/colors.ts`
2. ✅ Update CSS variables in `/src/index.css` (if needed)
3. ✅ Test all pages in light mode
4. ✅ Test all pages in dark mode
5. ✅ Verify button states (hover, active, disabled)
6. ✅ Check contrast ratios for accessibility
7. ✅ Test on mobile devices
8. ✅ Clear browser cache and rebuild

## Files to Update

### Primary File (Main Configuration)
- `/src/styles/colors.ts` - **Update this file to change colors**

### Secondary Files (Auto-synced)
- `/src/index.css` - CSS variables (already configured)
- `/tailwind.config.ts` - Tailwind configuration (already configured)

## Example: Changing to a Different Theme

### Green & Purple Theme Example

```typescript
// In /src/styles/colors.ts
export const colors = {
  primary: {
    DEFAULT: '#10b981', // Green
    light: '#34d399',
    dark: '#059669',
    foreground: '#ffffff',
  },
  secondary: {
    DEFAULT: '#8b5cf6', // Purple
    light: '#a78bfa',
    dark: '#7c3aed',
    foreground: '#ffffff',
  },
  // ... rest remains the same
}
```

Then update CSS variables in `/src/index.css`:
```css
:root {
  --primary: 160 84% 39%; /* Green */
  --secondary: 258 90% 66%; /* Purple */
  --gradient-primary: linear-gradient(135deg, #10b981 0%, #059669 100%);
  --gradient-secondary: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}
```

## Support

For questions or issues with the color theme system, refer to:
- Tailwind CSS Documentation: https://tailwindcss.com/docs/customizing-colors
- shadcn/ui Theming: https://ui.shadcn.com/docs/theming

---

**Last Updated:** January 22, 2026
**Current Theme:** Blue (#00aeef) & Orange (#f7941d)
**Version:** 1.0.0
