import type { Metadata } from 'next'
import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'

export const metadata: Metadata = {
  title: 'Privacy Policy - ProfitPro',
  description: 'ProfitPro privacy, terms of service, cancellation, refund, and cookie policies.',
}

const contact = (
  <address className="not-italic text-sub leading-7">
    <strong className="text-ink">ProfitPro</strong><br />
    Coimbatore, Tamil Nadu, India<br />
    Email: <a href="mailto:support@profitproz.com" className="text-[#66B159] hover:underline">support@profitproz.com</a><br />
    Phone: <a href="tel:+919363509110" className="text-[#66B159] hover:underline">+91 936 350 9110</a><br />
    Website: <a href="https://www.profitproz.com" className="text-[#66B159] hover:underline">www.profitproz.com</a>
  </address>
)

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-28 border-t border-zinc-800 pt-7 first:border-0 first:pt-0">
      <h2 className="mb-3 text-xl font-semibold text-ink">{title}</h2>
      <div className="space-y-4 text-sm leading-7 text-sub">{children}</div>
    </section>
  )
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-[#66B159]">{children}</ul>
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-[100dvh] bg-zinc-1000">
      <Nav />
      <main className="mx-auto max-w-4xl px-6 pb-20 pt-28 md:px-10">
        <div className="mb-8">
          <p className="label-upper mb-4 text-[#66B159]">Legal</p>
          <h1 className="headline text-ink">Privacy Policy</h1>
          <p className="mt-3 text-sm text-sub">Effective Date: 1 January 2026</p>
        </div>

        <nav aria-label="Legal policy sections" className="surface mb-8 flex flex-wrap gap-x-5 gap-y-2 rounded-xl p-4 text-sm">
          <Link href="#privacy-policy" className="text-sub hover:text-[#66B159]">Privacy</Link>
          <Link href="#terms-of-service" className="text-sub hover:text-[#66B159]">Terms of Service</Link>
          <Link href="#cancellation-refund" className="text-sub hover:text-[#66B159]">Cancellation &amp; Refunds</Link>
          <Link href="#cookie-policy" className="text-sub hover:text-[#66B159]">Cookies</Link>
        </nav>

        <article id="privacy-policy" className="surface scroll-mt-28 space-y-7 rounded-2xl p-6 md:p-9">
          <p className="text-sm leading-7 text-sub">ProfitPro (“ProfitPro”, “we”, “our”, or “us”) respects your privacy and is committed to protecting the information you share with us. This Privacy Policy explains how we collect, use, store, and protect information when you visit <a href="https://www.profitproz.com" className="text-[#66B159] hover:underline">www.profitproz.com</a>, contact us, request a revenue audit, or use our hotel revenue management and OTA distribution services.</p>

          <PolicySection title="1. Information We Collect">
            <p>We may collect information including:</p>
            <List><li>Name</li><li>Hotel or property name</li><li>Email address</li><li>Phone number</li><li>City or location</li><li>Property and room information</li><li>Enquiry or service requirements</li><li>Information submitted through website forms, email, WhatsApp, or other communication channels</li><li>Business information required to provide our services</li><li>Technical information such as browser type, device information, IP address, and website usage information</li></List>
            <p>For clients using our revenue management, hotel onboarding, or OTA management services, we may also process information necessary to manage their property listings, rates, availability, reservations, and connected platforms.</p>
          </PolicySection>

          <PolicySection title="2. How We Use Information">
            <p>We may use the information we collect to:</p>
            <List><li>Respond to enquiries</li><li>Conduct requested hotel revenue audits</li><li>Provide revenue management and hotel onboarding services</li><li>Set up or manage OTA listings</li><li>Communicate with clients regarding their services</li><li>Prepare reports and recommendations</li><li>Provide customer support</li><li>Improve our website and services</li><li>Maintain security and prevent misuse</li><li>Meet legal, regulatory, accounting, or contractual requirements</li></List>
            <p>We do not sell personal information.</p>
          </PolicySection>

          <PolicySection title="3. Client Platform Access">
            <p>Where a client authorises ProfitPro to access OTA platforms, channel managers, property management systems, or related services, such access will be used only for providing the agreed services.</p>
            <p>Clients remain responsible for ensuring they have authority to provide ProfitPro with access to their accounts and business information.</p>
            <p>ProfitPro will take reasonable measures to protect credentials and account access entrusted to us.</p>
          </PolicySection>

          <PolicySection title="4. Sharing of Information">
            <p>We may share information only where reasonably necessary with:</p>
            <List><li>Employees or authorised team members</li><li>Technology and hosting providers</li><li>Analytics and communication service providers</li><li>Professional advisers</li><li>Service providers assisting us in delivering our services</li><li>Government or regulatory authorities where legally required</li></List>
            <p>We do not disclose client information to unrelated third parties for their independent marketing purposes.</p>
          </PolicySection>

          <PolicySection title="5. Data Security"><p>We use reasonable administrative, organisational, and technical safeguards designed to protect information from unauthorised access, disclosure, alteration, loss, or misuse.</p><p>However, no internet transmission or electronic storage system can be guaranteed to be completely secure.</p></PolicySection>
          <PolicySection title="6. Data Retention"><p>We retain information only for as long as reasonably necessary to provide our services, maintain business and accounting records, resolve disputes, meet contractual obligations, and meet applicable legal requirements.</p><p>Information that is no longer reasonably required may be securely deleted or anonymised.</p></PolicySection>
          <PolicySection title="7. Your Choices and Rights"><p>Subject to applicable law, you may contact us to request:</p><List><li>Information about personal data held by us</li><li>Correction of inaccurate information</li><li>Updating of your information</li><li>Deletion of information where applicable</li><li>Withdrawal of consent for processing based on consent</li></List><p>Withdrawal of consent will not affect processing already carried out lawfully before withdrawal. Requests can be submitted to <a href="mailto:support@profitproz.com" className="text-[#66B159] hover:underline">support@profitproz.com</a>.</p></PolicySection>
          <PolicySection title="8. Cookies and Analytics"><p>Our website may use essential cookies and analytics technologies to understand website usage, improve performance, maintain security, and provide a better browsing experience. You may control cookies through your browser settings.</p></PolicySection>
          <PolicySection title="9. Third-Party Platforms"><p>Our website and services may refer to or interact with third-party platforms such as Booking.com, Agoda, Airbnb, Expedia, MakeMyTrip, Goibibo, Yatra, channel managers, and other hospitality technology providers.</p><p>These companies operate independently and maintain their own privacy policies and terms. ProfitPro is not responsible for the privacy practices of third-party websites or platforms.</p></PolicySection>
          <PolicySection title="10. Changes to This Policy"><p>We may update this Privacy Policy periodically to reflect changes in our services, technology, or applicable laws. The latest version will be published on this website with its updated effective date.</p></PolicySection>
          <PolicySection title="11. Contact Us">{contact}</PolicySection>
        </article>

        <article id="terms-of-service" className="surface mt-8 scroll-mt-28 space-y-7 rounded-2xl p-6 md:p-9">
          <header><h2 className="text-3xl font-semibold text-ink">Terms of Service</h2><p className="mt-2 text-sm text-sub">Effective Date: 1 January 2026</p></header>
          <p className="text-sm leading-7 text-sub">These Terms of Service apply to the use of the ProfitPro website and services. By engaging ProfitPro for services, you agree to these terms together with any separate proposal, agreement, quotation, or service contract entered into with ProfitPro.</p>
          <PolicySection title="1. Our Services"><p>ProfitPro provides hospitality-related business services including:</p><List><li>Hotel revenue management</li><li>Dynamic pricing support</li><li>OTA onboarding</li><li>OTA listing optimisation</li><li>Rate and inventory configuration</li><li>Distribution management</li><li>Competitor and market analysis</li><li>Revenue reporting</li><li>Related hotel consulting and support</li></List><p>The exact scope of work for each client may be defined separately in a quotation, proposal, agreement, or service plan.</p></PolicySection>
          <PolicySection title="2. Client Responsibilities"><p>Clients are responsible for:</p><List><li>Providing accurate property and business information</li><li>Providing necessary approvals and authorised platform access</li><li>Keeping ProfitPro informed of operational or commercial changes</li><li>Ensuring information supplied to ProfitPro can legally be used</li><li>Reviewing important pricing, inventory, policy, or contractual decisions when required</li></List><p>The client must not provide access to any account that they are not authorised to manage.</p></PolicySection>
          <PolicySection title="3. Revenue and Performance"><p>ProfitPro uses market information, property performance, demand patterns, competitor pricing, historical information, and other available indicators when making revenue-management recommendations or changes.</p><p>Hotel performance may be affected by numerous factors outside ProfitPro&apos;s control, including market demand, competition, property quality, guest reviews, economic conditions, weather, events, OTA algorithms, and platform policies.</p><p>Accordingly, historical results, projections, occupancy improvements, RevPAR improvements, or other performance examples do not constitute a guarantee of future results.</p></PolicySection>
          <PolicySection title="4. Third-Party Platforms"><p>ProfitPro may manage or interact with services operated by third parties, including OTAs, channel managers, payment services, and hospitality software providers. ProfitPro does not control the availability, policies, algorithms, charges, suspensions, technical failures, or decisions of those third parties.</p></PolicySection>
          <PolicySection title="5. Fees and Payments"><p>Service fees, billing frequency, taxes, payment deadlines, and other commercial terms will be specified in the applicable quotation, invoice, proposal, or agreement. Invoices must be paid within the agreed payment period.</p></PolicySection>
          <PolicySection title="6. Intellectual Property"><p>The ProfitPro name, website, branding, reports, designs, documents, strategies, and original materials created by ProfitPro remain the intellectual property of ProfitPro unless otherwise agreed in writing.</p><p>Clients retain ownership of their own property information, photographs, branding, and materials supplied to ProfitPro.</p></PolicySection>
          <PolicySection title="7. Confidentiality"><p>ProfitPro will take reasonable measures to keep non-public client information confidential and use it only for legitimate business and service purposes.</p><p>Clients must similarly treat non-public ProfitPro information, processes, documentation, pricing structures, and proprietary materials as confidential.</p></PolicySection>
          <PolicySection title="8. Service Availability"><p>We aim to provide reliable and timely services but cannot guarantee uninterrupted access to websites, OTAs, APIs, channel managers, hosting providers, internet services, or other third-party systems.</p></PolicySection>
          <PolicySection title="9. Limitation of Liability"><p>To the extent permitted by applicable law, ProfitPro will not be liable for indirect or consequential losses resulting from circumstances outside our reasonable control, including third-party platform outages, OTA policy changes, technical failures, market conditions, or inaccurate information supplied by the client.</p><p>Nothing in these terms excludes liability that cannot legally be excluded.</p></PolicySection>
          <PolicySection title="10. Termination"><p>Either party may terminate services in accordance with the notice period or termination conditions contained in the applicable service agreement or proposal. Any outstanding amounts due for services already provided remain payable after termination.</p></PolicySection>
          <PolicySection title="11. Governing Law"><p>These Terms will be governed by applicable laws of India. Unless otherwise agreed in writing, disputes relating to ProfitPro&apos;s services will be subject to the jurisdiction of courts having appropriate jurisdiction in Coimbatore, Tamil Nadu, India.</p></PolicySection>
          <PolicySection title="12. Contact">{contact}</PolicySection>
        </article>

        <article id="cancellation-refund" className="surface mt-8 scroll-mt-28 space-y-7 rounded-2xl p-6 md:p-9">
          <header><h2 className="text-3xl font-semibold text-ink">Cancellation &amp; Refund Policy</h2><p className="mt-2 text-sm text-sub">Effective Date: 29 September 2026</p></header>
          <p className="text-sm leading-7 text-sub">ProfitPro provides professional B2B hotel revenue management, OTA management, onboarding, and consulting services. Because our services involve professional time, account configuration, research, strategy, and ongoing operational work, fees for work already completed are generally non-refundable.</p>
          <PolicySection title="Cancellation"><p>Clients may request cancellation in accordance with the notice period stated in their individual service agreement, proposal, or quotation. Where no separate cancellation term exists, ProfitPro will review cancellation requests on a case-by-case basis.</p></PolicySection>
          <PolicySection title="Refunds"><p>A refund may be considered where:</p><List><li>A duplicate payment has been made</li><li>An incorrect amount has been charged</li><li>ProfitPro has agreed in writing that a paid service cannot be provided</li></List><p>Refunds will normally not be provided for:</p><List><li>Work already completed</li><li>Hotel or OTA onboarding already performed</li><li>Revenue-management work already undertaken</li><li>Client delays or failure to provide required information</li><li>Changes in the client&apos;s business plans</li><li>Results affected by market conditions or third-party OTA platforms</li></List><p>Approved refunds will be returned using an appropriate payment method within a reasonable processing period. For billing questions, contact <a href="mailto:support@profitproz.com" className="text-[#66B159] hover:underline">support@profitproz.com</a>.</p></PolicySection>
        </article>

        <article id="cookie-policy" className="surface mt-8 scroll-mt-28 space-y-7 rounded-2xl p-6 md:p-9">
          <header><h2 className="text-3xl font-semibold text-ink">Cookie Policy</h2></header>
          <div className="space-y-4 text-sm leading-7 text-sub">
            <p>ProfitPro may use cookies and similar technologies on <a href="https://www.profitproz.com" className="text-[#66B159] hover:underline">www.profitproz.com</a>. Cookies are small files used by websites to remember information and improve functionality.</p>
            <p>We may use cookies for:</p>
            <List><li>Essential website functionality</li><li>Website security</li><li>Performance monitoring</li><li>Understanding website traffic</li><li>Analytics</li><li>Improving the user experience</li></List>
            <p>Where non-essential cookies requiring consent are used, appropriate consent mechanisms may be displayed. You can also disable or remove cookies using your browser settings. Disabling certain cookies may affect some website functionality.</p>
            <p>Third-party services used on our website may also place cookies according to their own privacy policies. For questions regarding cookies or privacy, contact <a href="mailto:support@profitproz.com" className="text-[#66B159] hover:underline">support@profitproz.com</a>.</p>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  )
}
