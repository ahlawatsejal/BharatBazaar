import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { adminService } from '../../services/adminService';

const TOPICS = {
  'privacy-policy': {
    eyebrow: 'Marketplace Policy',
    title: 'Privacy Policy',
    summary:
      'How BharatBazaar handles account, order, and newsletter information across the platform.',
    sections: [
      {
        heading: 'Account & Order Information',
        body: 'BharatBazaar stores registration details (name, email, role), delivery addresses, order records, and return request details needed to operate customer orders, artisan storefronts, and platform administration.',
      },
      {
        heading: 'Newsletter Subscriptions',
        body: 'Email addresses submitted through the footer newsletter form are stored securely for marketplace updates. Subscriber lists are never exposed on public endpoints.',
      },
      {
        heading: 'Formal Privacy Disclosures',
        badge: 'Pending Owner Review',
        body: 'Full legal privacy clauses—including data retention periods, third-party processor disclosures, and formal grievance officer contact details—are pending owner review before production launch.',
      },
    ],
  },
  terms: {
    eyebrow: 'Marketplace Policy',
    title: 'Terms & Conditions',
    summary:
      'Platform usage guidelines for customers browsing BharatBazaar and artisans listing handmade goods.',
    sections: [
      {
        heading: 'Marketplace Roles',
        body: 'Customers may browse approved listings, place orders, and submit return requests for delivered items. Sellers apply through the artisan onboarding flow and must be approved by platform administrators before listings appear publicly.',
      },
      {
        heading: 'Order & Return Workflows',
        body: 'Order status updates, shipping tracking, and return request reviews are managed through the BharatBazaar customer, seller, and admin dashboards.',
      },
      {
        heading: 'Legal & Jurisdiction Clauses',
        badge: 'Pending Owner Review',
        body: 'Formal commercial terms—including commission schedules, dispute resolution, intellectual property clauses, and governing law—are pending owner review.',
      },
    ],
  },
  'shipping-policy': {
    eyebrow: 'Customer Support',
    title: 'Shipping & Return Policy',
    summary:
      'Order fulfilment, delivery tracking, and return request handling on BharatBazaar.',
    sections: [
      {
        heading: 'Order Tracking',
        body: 'Signed-in customers can view order statuses and payment references anytime from their Customer Orders dashboard.',
        cta: { label: 'View My Orders', to: '/customer/orders' },
      },
      {
        heading: 'Return Requests',
        body: 'Eligible delivered order items can be submitted for return directly from your Customer Returns page, where each request is tracked through review and resolution.',
        cta: { label: 'Go to Returns', to: '/customer/returns' },
      },
      {
        heading: 'Courier Partners & SLA Timelines',
        badge: 'Pending Owner Review',
        body: 'Exact dispatch SLAs, courier partner coverage, and refund settlement timelines are pending owner review.',
      },
    ],
  },
  contact: {
    eyebrow: 'Customer Support',
    title: 'Contact & Support',
    summary:
      'Reach out to the BharatBazaar support team or explore self-service order and artisan pages.',
    sections: [
      {
        heading: 'Self-Service Resources',
        body: 'Use your customer account to track orders or submit a return request, or visit the seller registration page if you are an artisan looking to join BharatBazaar.',
      },
      {
        heading: 'Support Desk',
        badge: 'Pending Owner Review',
        body: 'Published support hours and escalation SLAs are pending owner review. Configured marketplace contact details appear below when set by the platform administrator.',
      },
    ],
  },
};

export default function InfoPage() {
  const { topic } = useParams();
  const page = TOPICS[topic] || null;
  const [siteInfo, setSiteInfo] = useState(null);

  useEffect(() => {
    let active = true;
    adminService
      .getPublicPlatformSettings()
      .then((data) => {
        if (active && data) setSiteInfo(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--cream)' }}>
      <Navbar />

      <main className="flex-1 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          {!page ? (
            <div
              className="bg-white border p-8 sm:p-10 text-center"
              style={{ borderColor: '#E8DED2' }}
            >
              <p className="section-eyebrow">Information</p>
              <h1
                className="text-3xl font-semibold mb-3"
                style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}
              >
                Page Not Found
              </h1>
              <p
                className="text-sm mb-6"
                style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}
              >
                The requested information page is unavailable.
              </p>
              <Link
                to="/shop"
                className="inline-block px-6 py-2.5 text-xs font-semibold uppercase tracking-widest"
                style={{ background: 'var(--burgundy)', color: '#fff', fontFamily: 'var(--font-sans)' }}
              >
                Return to Shop
              </Link>
            </div>
          ) : (
            <article className="bg-white border p-8 sm:p-12" style={{ borderColor: '#E8DED2' }}>
              <p className="section-eyebrow">{page.eyebrow}</p>
              <h1
                className="text-3xl sm:text-4xl font-semibold mb-3"
                style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}
              >
                {page.title}
              </h1>
              <span className="divider-gold" />
              <p
                className="text-sm sm:text-base leading-relaxed mb-8"
                style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}
              >
                {page.summary}
              </p>

              <div className="space-y-6">
                {page.sections.map((section) => (
                  <section
                    key={section.heading}
                    className="p-5 border"
                    style={{ background: '#FCF9F4', borderColor: '#EDE4D7' }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <h2
                        className="text-lg font-semibold"
                        style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}
                      >
                        {section.heading}
                      </h2>
                      {section.badge && (
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 border"
                          style={{
                            color: '#7A5C4A',
                            borderColor: '#D9C8B4',
                            background: '#F7EFE5',
                            fontFamily: 'var(--font-sans)',
                          }}
                        >
                          {section.badge}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}
                    >
                      {section.body}
                    </p>
                    {section.cta && (
                      <div className="mt-3">
                        <Link
                          to={section.cta.to}
                          className="text-xs font-semibold uppercase tracking-wider underline"
                          style={{ color: 'var(--burgundy)', fontFamily: 'var(--font-sans)' }}
                        >
                          {section.cta.label}
                        </Link>
                      </div>
                    )}
                  </section>
                ))}
              </div>

              {(siteInfo?.support_email || siteInfo?.support_phone) && (
                <div
                  className="mt-8 p-5 border"
                  style={{ borderColor: '#E8DED2', background: 'var(--cream)' }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-2"
                    style={{ color: 'var(--burgundy)', fontFamily: 'var(--font-sans)' }}
                  >
                    Marketplace Contact
                  </p>
                  <div
                    className="text-sm space-y-1"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}
                  >
                    {siteInfo.support_email && <p>Email: {siteInfo.support_email}</p>}
                    {siteInfo.support_phone && <p>Phone: {siteInfo.support_phone}</p>}
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t flex flex-wrap gap-4" style={{ borderColor: '#EDE4D7' }}>
                <Link
                  to="/shop"
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--burgundy)', fontFamily: 'var(--font-sans)' }}
                >
                  Browse Marketplace
                </Link>
                <Link
                  to="/artisans"
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}
                >
                  Meet Artisans
                </Link>
                <Link
                  to="/seller/register"
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}
                >
                  Become a Seller
                </Link>
              </div>
            </article>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
