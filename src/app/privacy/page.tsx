import Link from "next/link";

export const metadata = { title: "Privacy Policy – FLOX", description: "FLOX Privacy Policy — how we collect, use, and protect your data." };

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: May 30, 2026</p>

        <section className="space-y-8 text-sm leading-relaxed text-foreground/80">

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Who We Are</h2>
            <p>FLOX (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is an Instagram growth and lead management platform operated by CodeMode AI. Our service is available at <strong>flox.codemodeai.com</strong>. You can reach us at <a href="mailto:support@codemodeai.com" className="text-blue-500 underline">support@codemodeai.com</a>.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account data:</strong> Name, email address, and password (hashed) when you register.</li>
              <li><strong>Instagram data:</strong> When you connect your Instagram account via Meta Login, we access your Instagram username, profile picture, follower count, post reach, and engagement insights. This data belongs to you and is used solely to power your FLOX dashboard.</li>
              <li><strong>Usage data:</strong> Pages visited, features used, session duration, and interaction patterns within the FLOX app. We use this to improve the product and, with your consent, to personalize our communications with you.</li>
              <li><strong>Lead data:</strong> Contact information and engagement scores for leads you manually add or import into FLOX. You own this data.</li>
              <li><strong>Payment data:</strong> Processed securely by our payment provider. We do not store card numbers.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To provide, maintain, and improve the FLOX platform.</li>
              <li>To display your Instagram analytics and growth metrics inside your dashboard.</li>
              <li>To track your usage patterns and assign interest scores so we can offer you relevant FLOX features, upgrades, or services that match your growth stage.</li>
              <li>To send product updates, tips, and promotional offers (you can opt out at any time).</li>
              <li>To comply with legal obligations.</li>
            </ul>
            <p className="mt-3">We <strong>do not</strong> sell your personal data to third parties. We <strong>do not</strong> use Instagram API data to build profiles on third parties or for ad targeting on other platforms.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">4. Meta / Instagram Data</h2>
            <p>FLOX uses the Meta Graph API to access your Instagram Business account data. By connecting your Instagram account you consent to us storing your Instagram access token, username, follower count, and engagement insights for the duration of your FLOX subscription.</p>
            <p className="mt-2">We use this data exclusively to display analytics inside your own FLOX account. We do not share this data with third parties. You can disconnect your Instagram account at any time from <strong>Settings → Connections</strong>, which will delete all stored Instagram tokens and data from our servers.</p>
            <p className="mt-2">For more on how Meta handles data, see <a href="https://www.facebook.com/policy.php" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Meta&apos;s Data Policy</a>.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">5. Data Retention</h2>
            <p>We retain your data for as long as your account is active. If you delete your account, we remove your personal data within 30 days. Instagram-specific data is removed immediately upon disconnecting your Instagram account or deleting your FLOX account.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">6. Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Access:</strong> Request a copy of your data.</li>
              <li><strong>Correction:</strong> Update inaccurate data from your settings page.</li>
              <li><strong>Deletion:</strong> Request full deletion of your account and data by emailing <a href="mailto:support@codemodeai.com" className="text-blue-500 underline">support@codemodeai.com</a> or using the <a href="/api/data-deletion" className="text-blue-500 underline">data deletion request form</a>.</li>
              <li><strong>Portability:</strong> Request an export of your data.</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing emails at any time.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">7. Cookies</h2>
            <p>We use essential cookies for authentication (Supabase session token) and optional analytics cookies to understand how the app is used. You can disable non-essential cookies in your browser settings.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">8. Security</h2>
            <p>We use industry-standard encryption (TLS in transit, AES-256 at rest via Supabase) and row-level security to ensure your data is only accessible to you.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">9. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify you by email or in-app notification of material changes. Continued use of FLOX after changes constitutes acceptance.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">10. Contact</h2>
            <p>For any privacy-related questions or data requests, contact us at <a href="mailto:support@codemodeai.com" className="text-blue-500 underline">support@codemodeai.com</a>.</p>
          </div>

        </section>
      </div>
    </main>
  );
}
