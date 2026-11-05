const GOOGLE_PREFIX = "google:";

// A last safety net: in demo mode, email can only reach the demo inbox, or someone
// who signed in with their own Google account and so gave us a real address.
export function isAllowedRecipient(
  recipient: { email: string; lmsId: string },
  demoMode: boolean,
  inbox: string,
): boolean {
  if (!demoMode) return true;
  if (recipient.lmsId.startsWith(GOOGLE_PREFIX)) return true;
  const [inboxLocal, inboxDomain] = inbox.toLowerCase().split("@");
  if (!inboxDomain) return false;
  const [local, domain] = recipient.email.toLowerCase().split("@");
  return domain === inboxDomain && local.split("+")[0] === inboxLocal;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|li|h2|div)>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}
