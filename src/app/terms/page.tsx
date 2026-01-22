"use client";

import { FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <section className="gradient-hero py-20">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <FileText className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="font-display text-4xl md:text-5xl font-bold text-background mb-6">
              Terms & Conditions
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
            <h2>Acceptance of Terms</h2>
            <p>
              By accessing and using Bharat Mock, you accept and agree to be bound by the terms and 
              provisions of this agreement. If you do not agree to these terms, please do not use our services.
            </p>

            <h2>Use of Services</h2>
            <h3>Eligibility</h3>
            <p>
              You must be at least 13 years old to use our services. By using Bharat Mock, you represent 
              and warrant that you meet this age requirement.
            </p>

            <h3>Account Registration</h3>
            <p>To access certain features, you must register for an account. You agree to:</p>
            <ul>
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your password</li>
              <li>Notify us immediately of any unauthorized use</li>
              <li>Be responsible for all activities under your account</li>
            </ul>

            <h2>User Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the platform for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Share exam content or questions without permission</li>
              <li>Engage in any form of cheating or academic dishonesty</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Upload malicious code or viruses</li>
              <li>Scrape or copy content without authorization</li>
            </ul>

            <h2>Intellectual Property</h2>
            <p>
              All content on Bharat Mock, including text, graphics, logos, images, and software, is the 
              property of Bharat Mock or its content suppliers and is protected by copyright laws.
            </p>
            <p>You may not:</p>
            <ul>
              <li>Reproduce or distribute our content without permission</li>
              <li>Modify or create derivative works</li>
              <li>Use our content for commercial purposes</li>
              <li>Remove copyright or proprietary notices</li>
            </ul>

            <h2>Exam Services</h2>
            <h3>Mock Tests</h3>
            <p>
              Our mock tests are designed to simulate real exam conditions. Results are for practice 
              purposes only and do not guarantee performance in actual exams.
            </p>

            <h3>Paid Services</h3>
            <p>
              Some exams and features may require payment. All payments are processed securely through 
              third-party payment gateways. Refund policies are outlined separately.
            </p>

            <h2>Content Accuracy</h2>
            <p>
              While we strive to provide accurate and up-to-date information, we do not guarantee the 
              accuracy, completeness, or reliability of any content on our platform. Use of our services 
              is at your own risk.
            </p>

            <h2>Limitation of Liability</h2>
            <p>
              Bharat Mock shall not be liable for any indirect, incidental, special, consequential, or 
              punitive damages resulting from your use or inability to use our services.
            </p>

            <h2>Termination</h2>
            <p>
              We reserve the right to terminate or suspend your account at any time, without prior notice, 
              for conduct that we believe violates these Terms or is harmful to other users or our business.
            </p>

            <h2>Modifications to Service</h2>
            <p>
              We reserve the right to modify or discontinue our services at any time, with or without notice. 
              We shall not be liable to you or any third party for any modification, suspension, or 
              discontinuance of the service.
            </p>

            <h2>Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India, without 
              regard to its conflict of law provisions.
            </p>

            <h2>Dispute Resolution</h2>
            <p>
              Any disputes arising from these Terms or your use of our services shall be resolved through 
              binding arbitration in accordance with Indian arbitration laws.
            </p>

            <h2>Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of any changes by posting 
              the new Terms on this page and updating the "Last updated" date.
            </p>

            <h2>Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <ul>
              <li>Email: legal@bharatmock.com</li>
              <li>Phone: +91 1800-123-4567</li>
            </ul>

            <h2>Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall 
              be limited or eliminated to the minimum extent necessary so that these Terms shall otherwise 
              remain in full force and effect.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
