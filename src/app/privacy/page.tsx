"use client";

import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <section className="gradient-hero py-20">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <Shield className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="font-display text-4xl md:text-5xl font-bold text-background mb-6">
              Privacy Policy
            </h1>
            <p className="text-lg text-background/80">
              Last updated: January 2026
            </p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-main">
          <div className="max-w-4xl mx-auto prose prose-lg">
            <h2>Introduction</h2>
            <p>
              At Bharat Mock, we take your privacy seriously. This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your information when you use our platform.
            </p>

            <h2>Information We Collect</h2>
            <h3>Personal Information</h3>
            <p>We collect information that you provide directly to us, including:</p>
            <ul>
              <li>Name and contact information (email address, phone number)</li>
              <li>Account credentials (username and password)</li>
              <li>Profile information (date of birth, education details)</li>
              <li>Payment information (for paid services)</li>
            </ul>

            <h3>Usage Information</h3>
            <p>We automatically collect certain information when you use our platform:</p>
            <ul>
              <li>Exam attempts and performance data</li>
              <li>Device information and IP address</li>
              <li>Browser type and operating system</li>
              <li>Pages visited and time spent on the platform</li>
            </ul>

            <h2>How We Use Your Information</h2>
            <p>We use the collected information for various purposes:</p>
            <ul>
              <li>To provide and maintain our services</li>
              <li>To process your exam attempts and generate results</li>
              <li>To send you important updates and notifications</li>
              <li>To improve our platform and user experience</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To comply with legal obligations</li>
            </ul>

            <h2>Information Sharing</h2>
            <p>
              We do not sell your personal information. We may share your information only in the 
              following circumstances:
            </p>
            <ul>
              <li>With your consent</li>
              <li>With service providers who assist in our operations</li>
              <li>To comply with legal requirements</li>
              <li>To protect our rights and prevent fraud</li>
            </ul>

            <h2>Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal 
              information against unauthorized access, alteration, disclosure, or destruction. However, 
              no method of transmission over the Internet is 100% secure.
            </p>

            <h2>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Object to processing of your information</li>
              <li>Export your data</li>
            </ul>

            <h2>Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to enhance your experience on our platform. 
              You can control cookie preferences through your browser settings.
            </p>

            <h2>Children's Privacy</h2>
            <p>
              Our services are intended for users aged 13 and above. We do not knowingly collect 
              information from children under 13. If you believe we have collected information from 
              a child under 13, please contact us.
            </p>

            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new policy on this page and updating the "Last updated" date.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <ul>
              <li>Email: privacy@bharatmock.com</li>
              <li>Phone: +91 1800-123-4567</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
