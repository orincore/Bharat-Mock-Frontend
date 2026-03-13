import { RefundPolicyData } from '@/types';

export const fallbackRefundPolicy: RefundPolicyData = {
  content: {
    id: 'fallback-refund-policy',
    title: 'Refund Policy',
    last_updated: '2026-02-09',
    intro_body: 'Thank you for purchasing from Bharat Mock. If, for any reason, you are not completely satisfied with your purchase, please review our Refund Policy. This policy applies to all purchases made on our website.',
    contact_email: 'info@bharatmock.com',
    contact_url: 'https://bharatmock.com/'
  },
  sections: [
    {
      id: 'interpretation-definitions',
      title: 'Interpretation and Definitions',
      description: 'Key terms and their meanings for this refund policy',
      display_order: 0,
      is_active: true,
      points: [
        {
          id: 'interpretation',
          heading: 'Interpretation',
          body: 'The words whose initial letters are capitalized have meanings defined under the following conditions. These definitions shall have the same meaning whether they appear in singular or plural.',
          display_order: 0,
          is_active: true,
          list_items: []
        },
        {
          id: 'definitions',
          heading: 'Definitions',
          body: 'For the purposes of this Refund Policy:',
          display_order: 1,
          is_active: true,
          list_items: [
            {
              term: 'Company',
              text: '(referred to as "the Company", "We", "Us", or "Our") refers to Bharat Mock.'
            },
            {
              term: 'Service',
              text: 'refers to the Website and online educational platform.'
            },
            {
              term: 'Website',
              text: 'refers to Bharat Mock, accessible from https://bharatmock.com/'
            },
            {
              term: 'Orders',
              text: 'mean a request by You to purchase any course, test series, subscription, or digital content from Us.'
            },
            {
              term: 'Digital Products',
              text: 'refer to online mock tests, courses, subscriptions, or any educational material provided through the website.'
            },
            {
              term: 'You',
              text: 'means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service.'
            }
          ]
        }
      ]
    },
    {
      id: 'refund-eligibility',
      title: 'Refund Eligibility',
      description: 'Conditions under which refunds may be granted',
      display_order: 1,
      is_active: true,
      points: [
        {
          id: 'eligibility-conditions',
          heading: 'Since Bharat Mock provides digital educational content, refunds are subject to the following conditions:',
          body: '',
          display_order: 0,
          is_active: true,
          list_items: [
            'You may request a refund within 7 days from the date of purchase.',
            'Refund requests must be made by contacting us through the email provided below.',
            'Refund will only be granted if the request is genuine and within the allowed time period.'
          ]
        },
        {
          id: 'refusal-conditions',
          heading: 'We reserve the right to refuse a refund if:',
          body: '',
          display_order: 1,
          is_active: true,
          list_items: [
            'The request is made after 7 days from purchase.',
            'The course / test series / subscription has been significantly used.',
            'The purchase was made during a discount, offer, or promotional sale (unless required by law).',
            'The account shows suspicious or abusive activity.'
          ]
        }
      ]
    },
    {
      id: 'non-refundable-cases',
      title: 'Non-Refundable Cases',
      description: 'Situations where refunds will not be provided',
      display_order: 2,
      is_active: true,
      points: [
        {
          id: 'no-refund-situations',
          heading: 'Refunds will NOT be provided in the following situations:',
          body: '',
          display_order: 0,
          is_active: true,
          list_items: [
            'After 7 days from purchase',
            'For discounted or promotional purchases',
            'For partially used subscriptions or test series',
            'For technical issues not caused by our platform',
            'If the user violates our Terms of Service'
          ]
        }
      ]
    },
    {
      id: 'refund-process',
      title: 'Refund Process',
      description: 'How to request and process refunds',
      display_order: 3,
      is_active: true,
      points: [
        {
          id: 'request-requirements',
          heading: 'To request a refund, you must send a clear request including:',
          body: '',
          display_order: 0,
          is_active: true,
          list_items: [
            'Your registered email ID',
            'Order details',
            'Reason for refund'
          ]
        },
        {
          id: 'request-methods',
          heading: 'You can request a refund by:',
          body: '',
          display_order: 1,
          is_active: true,
          list_items: [
            'Email: info@bharatmock.com',
            'Website: https://bharatmock.com/'
          ]
        },
        {
          id: 'processing-time',
          heading: 'Processing',
          body: 'If approved, the refund will be processed within 7–14 business days using the original payment method.',
          display_order: 2,
          is_active: true,
          list_items: []
        }
      ]
    },
    {
      id: 'contact-us',
      title: 'Contact Us',
      description: 'How to reach us for refund-related queries',
      display_order: 4,
      is_active: true,
      points: [
        {
          id: 'contact-info',
          heading: 'If you have any questions about our Refund Policy, you can contact us:',
          body: '',
          display_order: 0,
          is_active: true,
          list_items: [
            'Email: info@bharatmock.com',
            'Website: https://bharatmock.com/'
          ]
        }
      ]
    }
  ]
};