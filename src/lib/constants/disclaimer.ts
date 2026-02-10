import { DisclaimerData } from '@/types';

export const fallbackDisclaimer: DisclaimerData = {
  content: {
    id: 'fallback-disclaimer-content',
    title: 'Disclaimer',
    last_updated: '2026-02-09',
    intro_body:
      'This Disclaimer explains how Bharat Mock presents information, handles third-party resources, and sets expectations around liability, copyright usage, and professional guidance. Please review it carefully before relying on the Service.',
    contact_email: 'info@bharatmock.com',
    contact_url: 'https://bharatmock.com/'
  },
  sections: [
    {
      id: 'disclaimer-section-interpretation',
      title: 'Interpretation and Definitions',
      description:
        'Capitalized words have specific meanings. These definitions apply consistently whether terms appear in singular or plural form.',
      display_order: 0,
      is_active: true,
      points: [
        {
          id: 'disclaimer-point-interpretation',
          heading: 'Interpretation',
          body:
            'The words whose initial letters are capitalized have meanings defined under the following conditions. These definitions apply uniformly regardless of tense or grammatical form.',
          display_order: 0,
          is_active: true
        },
        {
          id: 'disclaimer-point-definitions',
          heading: 'Definitions',
          list_items: [
            {
              term: 'Company',
              text: 'Bharat Mock, referred to as the Company, We, Us, or Our within this Disclaimer.'
            },
            { term: 'Service', text: 'The Bharat Mock website and related offerings.' },
            {
              term: 'You',
              text: 'The individual accessing the Service, or the legal entity on whose behalf the individual uses the Service.'
            },
            { term: 'Website', text: 'Bharat Mock, accessible from https://bharatmock.com/.' }
          ],
          display_order: 1,
          is_active: true
        }
      ]
    },
    {
      id: 'disclaimer-section-disclaimer',
      title: 'Disclaimer',
      description: 'Core limitations of liability, accuracy of information, and service guarantees.',
      display_order: 1,
      is_active: true,
      points: [
        {
          id: 'disclaimer-point-general-info',
          heading: 'General Information',
          body:
            'The information contained on the Service is provided for general information purposes only. The Company assumes no responsibility for errors or omissions in the contents of the Service.',
          display_order: 0,
          is_active: true
        },
        {
          id: 'disclaimer-point-liability',
          heading: 'Limitation of Liability',
          body:
            'In no event shall the Company be liable for any special, direct, indirect, consequential, or incidental damages, whether in contract, negligence, or other tort, arising out of or in connection with the use of the Service or its contents.',
          display_order: 1,
          is_active: true
        },
        {
          id: 'disclaimer-point-content-updates',
          heading: 'Content Updates & Security',
          body:
            'The Company reserves the right to add, delete, or modify content on the Service at any time without prior notice and does not warrant that the Service is free of viruses or other harmful components.',
          display_order: 2,
          is_active: true
        }
      ]
    },
    {
      id: 'disclaimer-section-external-links',
      title: 'External Links Disclaimer',
      description: 'How third-party links presented on the Service should be interpreted.',
      display_order: 2,
      is_active: true,
      points: [
        {
          id: 'disclaimer-point-external',
          heading: 'Third-Party Websites',
          body:
            'The Service may contain links to external websites that are not provided or maintained by or in any way affiliated with the Company. The Company does not guarantee the accuracy, relevance, timeliness, or completeness of any information on these external websites.',
          display_order: 0,
          is_active: true
        }
      ]
    },
    {
      id: 'disclaimer-section-errors',
      title: 'Errors and Omissions Disclaimer',
      description: 'Accuracy commitments and the potential for mistakes or outdated material.',
      display_order: 3,
      is_active: true,
      points: [
        {
          id: 'disclaimer-point-guidance',
          heading: 'General Guidance',
          body:
            'The information supplied by the Service is for general guidance on matters of interest only. While the Company takes precautions to ensure the content is current and accurate, errors may occur and laws, rules, and regulations change over time.',
          display_order: 0,
          is_active: true
        },
        {
          id: 'disclaimer-point-no-guarantee',
          heading: 'No Guarantees',
          body:
            'The Company is not responsible for any errors or omissions, or for the results obtained from the use of this information.',
          display_order: 1,
          is_active: true
        }
      ]
    },
    {
      id: 'disclaimer-section-fair-use',
      title: 'Fair Use Disclaimer',
      description: 'Use of copyrighted material contained within the Service.',
      display_order: 4,
      is_active: true,
      points: [
        {
          id: 'disclaimer-point-fair-use',
          heading: 'Use of Copyrighted Material',
          body:
            'The Company may use copyrighted material which has not always been specifically authorized by the copyright owner for criticism, comment, news reporting, teaching, scholarship, or research purposes.',
          display_order: 0,
          is_active: true
        },
        {
          id: 'disclaimer-point-permission',
          heading: 'Permission Requirement',
          body:
            'If you wish to use copyrighted material from the Service for your own purposes that go beyond fair use, you must obtain permission from the copyright owner.',
          display_order: 1,
          is_active: true
        }
      ]
    },
    {
      id: 'disclaimer-section-views',
      title: 'Views Expressed Disclaimer',
      description: 'Clarifies that opinions belong to individual authors or users.',
      display_order: 5,
      is_active: true,
      points: [
        {
          id: 'disclaimer-point-views',
          heading: 'Opinions',
          body:
            'The Service may contain views and opinions which are those of the authors and do not necessarily reflect the official policy or position of any other agency, organization, employer, or company, including the Company.',
          display_order: 0,
          is_active: true
        },
        {
          id: 'disclaimer-point-user-generated',
          heading: 'User-Generated Content',
          body:
            'If the Service allows users to post content, such content is the sole responsibility of the user who posted it. The Company reserves the right to remove user-generated content for any reason.',
          display_order: 1,
          is_active: true
        }
      ]
    },
    {
      id: 'disclaimer-section-no-responsibility',
      title: 'No Responsibility Disclaimer',
      description: 'Clarifies that the Service does not replace professional advice.',
      display_order: 6,
      is_active: true,
      points: [
        {
          id: 'disclaimer-point-professional',
          heading: 'Professional Advice',
          body:
            'The information on the Service is provided with the understanding that the Company is not engaged in rendering legal, accounting, tax, or other professional services. It should not be used as a substitute for consultation with professional advisers.',
          display_order: 0,
          is_active: true
        },
        {
          id: 'disclaimer-point-damages',
          heading: 'Damages',
          body:
            'In no event shall the Company or its suppliers be liable for any special, incidental, indirect, or consequential damages arising out of or in connection with your access or use or inability to access or use the Service.',
          display_order: 1,
          is_active: true
        }
      ]
    },
    {
      id: 'disclaimer-section-use-at-risk',
      title: 'Use at Your Own Risk Disclaimer',
      description: 'All information is provided as-is without warranties or guarantees.',
      display_order: 7,
      is_active: true,
      points: [
        {
          id: 'disclaimer-point-as-is',
          heading: 'Information Provided "As Is"',
          body:
            'All information in the Service is provided "as is", with no guarantee of completeness, accuracy, timeliness, or of the results obtained from the use of this information, and without warranty of any kind.',
          display_order: 0,
          is_active: true
        },
        {
          id: 'disclaimer-point-reliance',
          heading: 'Reliance on Information',
          body:
            'The Company will not be liable to you or anyone else for any decision made or action taken in reliance on the information given by the Service, even if advised of the possibility of such damages.',
          display_order: 1,
          is_active: true
        }
      ]
    },
    {
      id: 'disclaimer-section-contact',
      title: 'Contact Us',
      description: 'Reach Bharat Mock for clarification or questions about this Disclaimer.',
      display_order: 8,
      is_active: true,
      points: [
        {
          id: 'disclaimer-point-contact',
          heading: 'Reach Out',
          list_items: ['By email: info@bharatmock.com', 'By website: https://bharatmock.com/'],
          display_order: 0,
          is_active: true
        }
      ]
    }
  ]
};
