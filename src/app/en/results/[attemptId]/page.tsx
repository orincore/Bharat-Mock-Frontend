// Locale-prefixed alias for the result page so /en/results/<attemptId> resolves.
// Client Component → re-export the default (useParams reads attemptId the same way).
export { default } from '@/app/results/[attemptId]/page';
