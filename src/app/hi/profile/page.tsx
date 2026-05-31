// Locale-prefixed alias for the profile page so /hi/profile resolves instead of 404ing.
// profile/page.tsx is a Client Component, so we re-export its default rather than
// calling it as a function (which would break client hooks).
export { default } from '@/app/profile/page';
