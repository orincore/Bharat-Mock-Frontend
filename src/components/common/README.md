Image and Section helpers

Usage:

- Wrap content sections with `Section` and provide a `title` prop. Descendant `Image` components will default their `alt` text to the nearest section title when `alt` is not provided.

Example:

```tsx
import { Section } from '@/components/common/Section';
import Image from '@/components/common/Image';

export default function Hero() {
  return (
    <Section title="Hero">
      <h2>Welcome</h2>
      <Image src="/images/hero.jpg" width={1200} height={600} />
      {/* alt will default to "Hero" */}
    </Section>
  );
}
```

ESLint:

The repo includes an `.eslintrc.json` rule that forbids direct imports from `next/image`. Use the wrapper instead.
