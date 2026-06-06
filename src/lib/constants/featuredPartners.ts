// Logos for the "Trusted by India's leading media and hiring partners" strip,
// shown on the homepage and the subscriptions page. Files live in
// public/assets/strip line/ — the folder name contains a space, so paths are
// URL-encoded (%20) for reliable static serving.
export interface FeaturedPartner {
  name: string;
  url: string;
}

const STRIP_DIR = '/assets/strip%20line';

export const FEATURED_PARTNERS: FeaturedPartner[] = [
  { name: 'DPIIT', url: `${STRIP_DIR}/DPIIT-logo.png` },
  { name: 'Google News', url: `${STRIP_DIR}/googlenews.png` },
  { name: 'Google My Business', url: `${STRIP_DIR}/google-my-business-logo.png` },
  { name: 'Trustpilot', url: `${STRIP_DIR}/trustpilot-logo.png` },
  { name: 'Just Dial', url: `${STRIP_DIR}/Justdial_logo.png` },
  { name: 'Medium', url: `${STRIP_DIR}/Medium__logo.png` },
  { name: 'Wikipedia', url: `${STRIP_DIR}/Wikipedia%20PNG%202.png` },
];
