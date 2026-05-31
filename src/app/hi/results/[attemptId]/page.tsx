// Locale-prefixed alias for the result page so /hi/results/<attemptId> resolves.
// The attempt page redirects here when the exam was completed in Hindi.
// Client Component → re-export the default (useParams reads attemptId the same way).
export { default } from '@/app/results/[attemptId]/page';
