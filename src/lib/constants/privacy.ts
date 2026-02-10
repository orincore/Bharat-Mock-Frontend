import { PrivacyPolicyData } from '@/types';

export const fallbackPrivacyPolicy: PrivacyPolicyData = {
  content: {
    id: 'fallback-privacy-content',
    title: 'Privacy Policy',
    last_updated: '2026-02-09',
    intro_body:
      'This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You. We use Your Personal Data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.',
    contact_email: 'info@bharatmock.com',
    contact_url: 'https://bharatmock.com/'
  },
  sections: [
    {
      id: 'privacy-section-interpretation',
      title: 'Interpretation and Definitions',
      description:
        'The words whose initial letters are capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.',
      display_order: 0,
      is_active: true,
      points: [
        {
          id: 'privacy-point-interpretation-description',
          heading: 'Interpretation',
          body:
            'The words whose initial letters are capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.',
          display_order: 0,
          is_active: true
        }
      ]
    },
    {
      id: 'privacy-section-definitions',
      title: 'Definitions',
      description: 'For the purposes of this Privacy Policy, the following terms apply.',
      display_order: 1,
      is_active: true,
      points: [
        {
          id: 'privacy-point-definitions-terms',
          heading: 'Defined terms',
          list_items: [
            { term: 'Account', text: 'A unique account created for You to access our Service or parts of our Service.' },
            { term: 'Affiliate', text: 'Any entity that controls, is controlled by, or is under common control with a party.' },
            { term: 'Company', text: 'Bharat Mock is referred to as the Company, We, Us or Our within this Privacy Policy.' },
            { term: 'Cookies', text: 'Small files placed on Your device containing details of Your browsing history.' },
            { term: 'Country', text: 'Maharashtra, India.' },
            { term: 'Device', text: 'Any device that can access the Service such as a computer, cell phone or digital tablet.' },
            { term: 'Personal Data', text: 'Any information that relates to an identified or identifiable individual.' },
            { term: 'Service', text: 'The Bharat Mock website and related offerings.' },
            { term: 'Service Provider', text: 'Any natural or legal person who processes data on behalf of the Company.' },
            { term: 'Usage Data', text: 'Data collected automatically such as IP address, browser type, and diagnostics.' },
            { term: 'Website', text: 'https://bharatmock.com/' },
            { term: 'You', text: 'The individual or legal entity accessing or using the Service.' }
          ],
          display_order: 0,
          is_active: true
        }
      ]
    },
    {
      id: 'privacy-section-data',
      title: 'Collecting and Using Your Personal Data',
      description: 'Overview of the categories of data we collect and how we use tracking technologies.',
      display_order: 2,
      is_active: true,
      points: [
        {
          id: 'privacy-point-data-personal',
          heading: 'Personal Data',
          body:
            'While using Our Service, we may ask You to provide certain information that can be used to contact or identify You, including email address, first name and last name, phone number, address, and Usage Data.',
          display_order: 0,
          is_active: true
        },
        {
          id: 'privacy-point-data-usage',
          heading: 'Usage Data',
          body:
            'Usage Data is collected automatically and may include IP address, browser type, device identifiers, crash diagnostics, and time spent on pages. When accessing via mobile we collect device type, OS, browser, and unique identifiers.',
          display_order: 1,
          is_active: true
        },
        {
          id: 'privacy-point-data-cookies',
          heading: 'Tracking Technologies and Cookies',
          body:
            'We use Cookies, beacons, tags, and scripts to collect information, improve the Service, and analyze performance. Cookies may be persistent or session-based, and non-essential cookies are used only with consent where required by law.',
          display_order: 2,
          is_active: true
        }
      ]
    },
    {
      id: 'privacy-section-use',
      title: 'Use of Your Personal Data',
      description: 'How Bharat Mock relies on Personal Data to provide and improve the Service.',
      display_order: 3,
      is_active: true,
      points: [
        {
          id: 'privacy-point-use-purposes',
          heading: 'Primary purposes',
          list_items: [
            'Provide and maintain the Service, including monitoring usage.',
            'Manage Your Account and deliver contractual services.',
            'Contact You regarding updates, security notices, and service notifications.',
            'Provide news, special offers, and information about similar goods or services unless you opt out.',
            'Manage requests, business transfers, analytics, improvements, and promotional campaigns.'
          ],
          display_order: 0,
          is_active: true
        }
      ]
    },
    {
      id: 'privacy-section-retention',
      title: 'Retention of Your Personal Data',
      description: 'Retention schedules for different categories of information and how long we hold it.',
      display_order: 4,
      is_active: true,
      points: [
        {
          id: 'privacy-point-retention-overview',
          heading: 'Retention schedule',
          body:
            'We retain Personal Data only as long as necessary for the purposes described. Where possible we apply shorter retention periods, aggregate or anonymize data, and securely delete records when no longer required.',
          display_order: 0,
          is_active: true
        },
        {
          id: 'privacy-point-retention-specifics',
          heading: 'Specific periods',
          list_items: [
            'User accounts: retained for the duration of the relationship plus up to 24 months.',
            'Support tickets and chat transcripts: up to 24 months for service quality and dispute resolution.',
            'Analytics cookies and device identifiers: up to 24 months for trend analysis.',
            'Server logs: up to 24 months for security monitoring.',
            'Longer retention may apply for legal obligations, claims, explicit user requests, or technical limitations.'
          ],
          display_order: 1,
          is_active: true
        }
      ]
    },
    {
      id: 'privacy-section-transfer',
      title: 'Transfer of Your Personal Data',
      description: 'How cross-border transfers and safeguards are handled.',
      display_order: 5,
      is_active: true,
      points: [
        {
          id: 'privacy-point-transfer',
          heading: 'International transfers',
          body:
            'Data may be processed outside your jurisdiction. We implement appropriate safeguards and supplementary measures where required by applicable law. No transfer occurs unless adequate controls are in place.',
          display_order: 0,
          is_active: true
        }
      ]
    },
    {
      id: 'privacy-section-delete',
      title: 'Delete Your Personal Data',
      description: 'Options for deleting or requesting deletion of your data.',
      display_order: 6,
      is_active: true,
      points: [
        {
          id: 'privacy-point-delete-rights',
          heading: 'Deletion rights',
          body:
            'You can request deletion of Personal Data, update or amend information, or access account settings to manage your information. You may also contact us to correct or erase Personal Data you have provided.',
          display_order: 0,
          is_active: true
        },
        {
          id: 'privacy-point-delete-limitations',
          heading: 'Limitations',
          body:
            'We may retain data where legally required or where we have a lawful basis, including compliance, security, or dispute resolution. Residual encrypted backups may exist temporarily but are not restored unless necessary.',
          display_order: 1,
          is_active: true
        }
      ]
    },
    {
      id: 'privacy-section-disclosure',
      title: 'Disclosure of Your Personal Data',
      description: 'Circumstances where we may disclose information to third parties.',
      display_order: 7,
      is_active: true,
      points: [
        {
          id: 'privacy-point-disclosure-business',
          heading: 'Business transactions',
          body:
            'If the Company is involved in a merger, acquisition, or asset sale, Personal Data may be transferred with notice provided.',
          display_order: 0,
          is_active: true
        },
        {
          id: 'privacy-point-disclosure-legal',
          heading: 'Legal requirements',
          body:
            'We may disclose Personal Data to comply with legal obligations, protect our rights or property, investigate wrongdoing, protect user safety, or defend against legal liability.',
          display_order: 1,
          is_active: true
        }
      ]
    },
    {
      id: 'privacy-section-security',
      title: 'Security of Your Personal Data',
      description: 'Steps we take to secure your information and related limitations.',
      display_order: 8,
      is_active: true,
      points: [
        {
          id: 'privacy-point-security',
          heading: 'Security measures',
          body:
            'The security of Your Personal Data is important to us, but no method of transmission or storage is 100% secure. We use commercially reasonable safeguards but cannot guarantee absolute security.',
          display_order: 0,
          is_active: true
        }
      ]
    },
    {
      id: 'privacy-section-children',
      title: "Children's Privacy",
      description: 'Our practices for individuals under the age of 16 and how to contact us about inadvertent collection.',
      display_order: 9,
      is_active: true,
      points: [
        {
          id: 'privacy-point-children',
          heading: 'Under 16 policy',
          body:
            'We do not knowingly collect information from anyone under 16. If you are a parent or guardian and become aware that your child has provided data, please contact us so we can take action.',
          display_order: 0,
          is_active: true
        }
      ]
    },
    {
      id: 'privacy-section-links',
      title: 'Links to Other Websites',
      description: 'Responsibilities regarding third-party sites we link to.',
      display_order: 10,
      is_active: true,
      points: [
        {
          id: 'privacy-point-links',
          heading: 'Third-party links',
          body:
            'Our Service may contain links to other websites not operated by us. We strongly advise reviewing their privacy policies since we have no control over their content or practices.',
          display_order: 0,
          is_active: true
        }
      ]
    },
    {
      id: 'privacy-section-changes',
      title: 'Changes to this Privacy Policy',
      description: 'How we communicate updates to this statement.',
      display_order: 11,
      is_active: true,
      points: [
        {
          id: 'privacy-point-changes',
          heading: 'Policy updates',
          body:
            'We may update this Privacy Policy from time to time. We will notify you via email and/or a prominent notice on the Service and update the “Last updated” date. Continued use constitutes acceptance.',
          display_order: 0,
          is_active: true
        }
      ]
    },
    {
      id: 'privacy-section-contact',
      title: 'Contact Us',
      description: 'How to reach Bharat Mock for privacy-related questions.',
      display_order: 12,
      is_active: true,
      points: [
        {
          id: 'privacy-point-contact',
          heading: 'Contact methods',
          list_items: ['By email: info@bharatmock.com', 'By website: https://bharatmock.com/'],
          display_order: 0,
          is_active: true
        }
      ]
    }
  ]
};
