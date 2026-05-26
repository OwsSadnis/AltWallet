const BLOCKED_DOMAINS = [
  'mailinator.com','tempmail.com','guerrillamail.com','throwam.com',
  'sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info',
  'spam4.me','trashmail.me','dispostable.com','yopmail.com','maildrop.cc',
  'spamgourmet.com','trashmail.at','trashmail.io','fakeinbox.com',
  'tempr.email','discard.email','mailnull.com','spamthisplease.com'
];

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return BLOCKED_DOMAINS.includes(domain);
}
