import Link from "next/link";

export const metadata = { title: "Terms of Service – FLOX" };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link href="/" className="text-lg font-bold">
          FLO<span className="text-blue-500">X</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Back to app
        </Link>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: June 2, 2026</p>

        <section className="space-y-8 text-sm leading-relaxed text-foreground/80">

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>By creating an account or using FLOX (&quot;Service&quot;), you agree to these Terms of Service (&quot;Terms&quot;). FLOX is operated by CodeMode AI and available at <strong>flox.codemodeai.com</strong>. If you do not agree to these Terms, do not use the Service.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">2. Description of Service</h2>
            <p>FLOX is an Instagram growth and lead management platform that helps creators and businesses schedule content, manage leads, track analytics, and automate engagement workflows via the Meta Graph API.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">3. Eligibility</h2>
            <p>You must be at least 18 years old and have the legal capacity to enter into a binding agreement to use the Service. By using FLOX, you represent and warrant that you meet these requirements.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">4. Account Registration</h2>
            <p>You must provide accurate and complete information when creating your account. You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account. Notify us immediately at <a href="mailto:support@codemodeai.com" className="text-blue-500 underline">support@codemodeai.com</a> if you suspect unauthorized access.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">5. Instagram / Meta Integration</h2>
            <p>FLOX integrates with the Meta Graph API. By connecting your Instagram Business or Creator account, you authorize FLOX to access and use your Instagram data (profile info, analytics, messages, comments, and content publishing) on your behalf as permitted by your chosen plan.</p>
            <p className="mt-2">You must comply with <a href="https://www.facebook.com/legal/terms" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Meta&apos;s Terms of Service</a> and <a href="https://developers.facebook.com/policy/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Meta Platform Policy</a> when using FLOX. You may not use FLOX to violate Instagram&apos;s Community Guidelines or any applicable law.</p>
            <p className="mt-2">You can disconnect your Instagram account at any time from <strong>Settings → Connections</strong>. Disconnecting revokes FLOX&apos;s access to your Instagram data.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">6. Acceptable Use</h2>
            <p>You agree not to use FLOX to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Violate any applicable law or regulation.</li>
              <li>Send spam, unsolicited messages, or engage in mass automated messaging that violates Meta&apos;s policies.</li>
              <li>Scrape, harvest, or collect data from Instagram or other platforms in violation of their terms.</li>
              <li>Impersonate any person or entity.</li>
              <li>Engage in any activity that disrupts or interferes with the Service.</li>
              <li>Attempt to gain unauthorized access to any part of the Service or its related systems.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">7. Intellectual Property</h2>
            <p>FLOX and its original content, features, and functionality are owned by CodeMode AI and are protected by intellectual property laws. You retain ownership of any content you create or import into FLOX. By using the Service, you grant CodeMode AI a limited license to process and display your content solely to provide the Service to you.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">8. Payment and Billing</h2>
            <p>Certain features of FLOX may require a paid subscription. Billing terms, pricing, and refund policies will be presented at the time of purchase. Subscriptions auto-renew unless cancelled. You may cancel at any time from your account settings.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">9. Termination</h2>
            <p>We may suspend or terminate your account at our discretion if you violate these Terms or engage in conduct harmful to other users or to CodeMode AI. You may delete your account at any time by contacting <a href="mailto:support@codemodeai.com" className="text-blue-500 underline">support@codemodeai.com</a>. Upon termination, your data will be deleted within 30 days in accordance with our Privacy Policy.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">10. Disclaimer of Warranties</h2>
            <p>The Service is provided &quot;as is&quot; without warranties of any kind, express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or that any particular results will be achieved. Use of the Service is at your sole risk.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">11. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, CodeMode AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, even if we have been advised of the possibility of such damages.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">12. Changes to Terms</h2>
            <p>We may update these Terms from time to time. We will notify you of material changes by email or in-app notification. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">13. Governing Law</h2>
            <p>These Terms are governed by applicable law. Any disputes arising under these Terms shall be resolved through binding arbitration or in a court of competent jurisdiction.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">14. Contact</h2>
            <p>For any questions about these Terms, contact us at <a href="mailto:support@codemodeai.com" className="text-blue-500 underline">support@codemodeai.com</a>.</p>
          </div>

        </section>
      </div>
    </main>
  );
}
