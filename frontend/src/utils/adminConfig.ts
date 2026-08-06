/**
 * Admin configuration — centralised list of admin emails.
 * Admin users bypass all feature gates, credit limits, and plan restrictions.
 */

const ADMIN_EMAILS: string[] = [
  "benadictfrancis.dev@gmail.com",
];

/** Check whether the given email belongs to an admin user. */
export const isAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
