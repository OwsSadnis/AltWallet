import { Eyebrow, Button } from "@/components/aw/Primitives";
import { Reveal } from "@/components/aw/motion";
import { Link } from "wouter";
import { ArrowLeft, Mail } from "lucide-react";
import { useT } from "@/i18n";

const UPDATED = "Apr 18, 2026";
const CONTACT_EMAIL = "hello@altwallet.id";
const COMPANY = "AltNeurealms";

export function Terms() {
  const t = useT();
  return (
    <LegalShell title={t("legal.terms.title")}>
      <p className="aw-legal-lead">
        AltWallet ("the Service") is a read-only blockchain due-diligence
        platform operated by {COMPANY} ("AltNeurealms", "we", "us", "our"). By
        accessing or using AltWallet you ("you", "user") agree to be bound by
        these Terms of Service. If you do not agree to any part of these
        Terms, please discontinue use immediately.
      </p>

      <h2>1. Service description</h2>
      <p>
        AltWallet analyses public on-chain data and third-party risk signals
        (including GoPlus Security and public block explorers) to produce a
        wallet risk score ranging from 0–100. We do not custody funds, sign
        transactions, or have the technical ability to move assets on your
        behalf. AltWallet never requests private keys, seed phrases, or a
        wallet connection.
      </p>

      <h2>2. Not financial or legal advice</h2>
      <p>
        The risk score, flags, transaction metadata and AI-generated
        summaries are provided for informational purposes only and do not
        constitute financial, legal, investment, tax or compliance advice.
        You are solely responsible for decisions made based on our output,
        and you should consult qualified professionals where appropriate.
      </p>

      <h2>3. User accounts</h2>
      <p>
        Some features of AltWallet require an account. You must provide
        accurate information when registering and keep your credentials
        secure. You are responsible for all activity under your account. One
        person or entity may not operate multiple accounts to circumvent
        rate limits or free-tier restrictions. We may suspend or terminate
        accounts that violate these Terms, with or without notice.
      </p>

      <h2>4. Subscription plans & payments</h2>
      <p>
        AltWallet offers Free, Pro and Business plans. Paid subscriptions are
        billed externally by Whop subject to Whop's own terms of service.
        AltNeurealms does not collect or store payment card details.
        Subscriptions renew automatically until cancelled via the Whop
        dashboard. Cancellations take effect at the end of the current
        billing period. Refunds are governed by Whop's refund policy.
      </p>

      <h2>5. Prohibited uses</h2>
      <p>
        You agree not to use AltWallet to: (a) scrape, crawl or otherwise
        harvest data programmatically outside of the API tier; (b) re-sell,
        sublicense, or commercially redistribute the Service or its output
        without written permission; (c) reverse engineer, decompile or
        disassemble the platform; (d) interfere with or disrupt the Service
        (including by overloading our infrastructure); (e) use the Service
        to facilitate money laundering, sanctions evasion, terrorism
        financing, or any other illegal activity; (f) impersonate any
        person or entity, or misrepresent your affiliation.
      </p>

      <h2>6. Beta chains</h2>
      <p>
        XRP and Sui are currently provided in Beta. Displayed scores are
        capped at 80 and include a 20% confidence reduction to reflect
        limited on-chain data coverage. Beta output should be treated as
        directional only and cross-checked against alternative sources
        before relying on it for material decisions.
      </p>

      <h2>7. Data retention</h2>
      <p>
        We retain your account email, plan status and a log of scan history
        for the lifetime of your account plus 90 days after account
        deletion, to comply with regulatory record-keeping requirements.
        Aggregate and de-identified analytics may be retained indefinitely.
        You may request earlier deletion by contacting us at the address
        below, subject to legal retention obligations.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
        WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
        LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY OF DATA. We do
        not guarantee that risk scores will identify every malicious
        address, nor that flagged addresses are conclusively malicious.
        On-chain data providers may be unavailable, incomplete or delayed.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by applicable law, AltNeurealms and
        its officers, directors, employees and affiliates will not be liable
        for any indirect, incidental, special, consequential, exemplary or
        punitive damages, or for any loss of profits, revenue, data, or
        business opportunities, arising from or related to your use of
        AltWallet — even if we have been advised of the possibility of such
        damages. Our total aggregate liability to you for all claims shall
        not exceed the fees paid by you to us in the twelve (12) months
        preceding the claim, or USD 100, whichever is greater.
      </p>

      <h2>10. Intellectual property</h2>
      <p>
        All text, graphics, logos, scoring algorithms and software
        comprising AltWallet are the property of AltNeurealms or its
        licensors and are protected by copyright, trademark and other laws.
        You receive a limited, non-exclusive, non-transferable licence to
        access the Service for personal or internal business use only.
      </p>

      <h2>11. Governing law & dispute resolution</h2>
      <p>
        These Terms are governed by the laws of the Republic of Indonesia,
        without regard to its conflict-of-law principles. Any dispute
        arising out of or in connection with these Terms shall be submitted
        to the exclusive jurisdiction of the competent courts of Jakarta,
        Indonesia, except where local consumer-protection law grants you a
        different mandatory forum.
      </p>

      <h2>12. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will
        be communicated via email or an in-app notice at least 14 days
        before taking effect. Continued use of the Service after the
        effective date constitutes acceptance of the revised Terms.
      </p>

      <h2>13. Contact information</h2>
      <p>
        Questions, complaints or legal notices regarding these Terms should
        be sent to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="aw-legal-link">
          {CONTACT_EMAIL}
        </a>
        . Registered entity: AltNeurealms, Jakarta, Indonesia.
      </p>
    </LegalShell>
  );
}

export function Privacy() {
  const t = useT();
  return (
    <LegalShell title={t("legal.privacy.title")}>
      <p className="aw-legal-lead">
        This Privacy Policy describes how AltNeurealms ("we", "us") collects,
        uses, stores, and protects your information when you use AltWallet
        ("the Service"). We designed AltWallet to minimise the data we
        collect: we analyse public blockchain data and never ask you to
        connect a wallet or share a private key.
      </p>

      <h2>1. Information we collect</h2>
      <p>
        <strong>Account information:</strong> email address, plan tier,
        hashed password, and (optional) display name. <br />
        <strong>Usage data:</strong> the wallet addresses you submit for
        scanning, chain selected, timestamp, and IP address at the time of
        the scan, so we can show your history and enforce rate limits.{" "}
        <br />
        <strong>Device & log data:</strong> browser user agent, operating
        system, referring URL, and coarse geo-IP for abuse detection.
      </p>

      <h2>2. Information we do not collect</h2>
      <p>
        We never collect private keys, seed phrases, signed transactions,
        payment card numbers, or any on-device wallet state. AltWallet does
        not require a wallet connection under any circumstance.
      </p>

      <h2>3. How we use your information</h2>
      <p>
        We use your information to (a) operate and secure the Service, (b)
        authenticate your account, (c) display your scan history, (d)
        enforce per-plan rate limits, (e) respond to support requests, (f)
        detect and prevent abuse, (g) comply with legal obligations, and
        (h) produce aggregated, de-identified analytics that help us
        improve the product.
      </p>

      <h2>4. Cookies & similar technologies</h2>
      <p>
        AltWallet uses strictly-necessary cookies to keep you signed in and
        remember your language preference. We use a privacy-respecting,
        cookieless analytics endpoint (Umami) for aggregate page-view
        counts; no personal identifiers or cross-site tracking IDs are
        involved. You can disable cookies in your browser, but parts of the
        Service (such as sign-in) will stop working.
      </p>

      <h2>5. Third-party services</h2>
      <p>
        We share the minimum data required with the following processors:
      </p>
      <ul>
        <li>
          <strong>GoPlus Security</strong> — wallet addresses are submitted
          to retrieve risk signals.
        </li>
        <li>
          <strong>Public block explorers</strong> (e.g. Etherscan, Solscan,
          Blockchain.com, Tronscan, XRPScan, SuiScan) — wallet addresses
          are submitted to retrieve transaction history.
        </li>
        <li>
          <strong>Whop</strong> — handles subscription checkout, billing
          and receipts. We receive the purchase status and plan tier only.
        </li>
        <li>
          <strong>Anthropic (Claude)</strong> — generates the plain-language
          AI summary from the risk signals we computed. Scan inputs are
          sent per request and are not used for model training per our
          agreement.
        </li>
        <li>
          <strong>Cloudflare</strong> — provides DDoS protection and edge
          routing.
        </li>
      </ul>

      <h2>6. Data retention</h2>
      <p>
        Account email and plan status are retained for the lifetime of your
        account. Scan history is retained per plan (30 days Free, 12 months
        Pro, 24 months Business) and then purged in monthly batches.
        Server logs are retained for 30 days for abuse detection. After
        account deletion, we keep a minimal record for 90 days to satisfy
        regulatory obligations, then permanently erase personal data.
      </p>

      <h2>7. Security measures</h2>
      <p>
        We apply industry-standard safeguards: TLS 1.3 in transit, AES-256
        encryption at rest, bcrypt password hashing, principle-of-least-
        privilege access controls, and regular third-party security
        reviews. No system is fully impenetrable; if we become aware of a
        breach that affects you, we will notify you within 72 hours in
        accordance with applicable law.
      </p>

      <h2>8. Your rights</h2>
      <p>
        Depending on your jurisdiction, you may have the right to access,
        correct, export or delete your personal data, and to object to or
        restrict certain processing. To exercise these rights, contact us
        at the address below. We will respond within 30 days.
      </p>

      <h2>9. Children's privacy</h2>
      <p>
        AltWallet is not directed at children under 18 and we do not
        knowingly collect personal data from children. If you believe a
        child has provided us information, please contact us and we will
        delete the relevant data promptly.
      </p>

      <h2>10. International transfers</h2>
      <p>
        Our infrastructure is primarily hosted in Singapore and the United
        States. By using the Service you consent to the transfer and
        processing of your data in these jurisdictions, subject to the
        safeguards described above.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material
        changes will be announced via email or in-app notice at least 14
        days before they take effect.
      </p>

      <h2>12. Contact</h2>
      <p>
        For privacy questions, data-subject requests, or to report an
        incident, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="aw-legal-link">
          {CONTACT_EMAIL}
        </a>
        . Data controller: AltNeurealms, Jakarta, Indonesia.
      </p>
    </LegalShell>
  );
}

function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <div className="container" style={{ paddingTop: 72, paddingBottom: 120 }}>
      <div className="mx-auto max-w-[720px] flex flex-col gap-5">
        <Reveal>
          <Link href="/">
            <Button variant="ghost" size="sm" icon={ArrowLeft}>
              {t("legal.back")}
            </Button>
          </Link>
        </Reveal>
        <Reveal delay={40}>
          <Eyebrow>Legal</Eyebrow>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="text-white text-[36px] md:text-[44px] font-bold tracking-tight leading-[1.1]">
            {title}
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <div className="text-[12px] text-[color:var(--fg-tertiary)] mono">
            {t("legal.updated")} · {UPDATED}
          </div>
        </Reveal>
        <Reveal delay={180}>
          <div className="aw-legal mt-6">{children}</div>
        </Reveal>
        <Reveal delay={240}>
          <div
            className="mt-10 flex items-center gap-3 rounded-2xl border p-5"
            style={{ background: "#0E0E0E", borderColor: "#1a1a1a" }}
          >
            <div className="aw-banner-icon">
              <Mail className="w-4 h-4" />
            </div>
            <div className="flex-1 text-[13px] text-[color:var(--fg-secondary)]">
              Questions? Reach the AltNeurealms team at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-white hover:text-[color:var(--accent)] transition-colors"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
