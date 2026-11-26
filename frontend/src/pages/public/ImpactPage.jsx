import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import AnnouncementBar from '../../components/layout/AnnouncementBar';
import Footer from '../../components/layout/Footer';

const PILLARS = [
  {
    eyebrow: '01 · Direct Studio Access',
    title: 'Empowering Independent Artisans & MSMEs',
    body: 'BharatBazaar gives regional workshops, weaver collectives, and rural craftspeople their own verified digital storefront without requiring technical intermediaries.',
  },
  {
    eyebrow: '02 · Heritage Preservation',
    title: 'Protecting Regional Craft Lineages',
    body: 'Every product listing highlights its craft tradition, materials, and Indian state of origin so patrons understand the cultural lineage behind what they bring home.',
  },
  {
    eyebrow: '03 · Responsible Craft',
    title: 'Small-Batch, Mindful Production',
    body: 'Handcrafted ceramics, natural-dyed textiles, and woven cane items are produced in small studio batches rather than mass-manufactured, supporting sustainable local economies.',
  },
  {
    eyebrow: '04 · Transparent Oversight',
    title: 'Curated Quality & Patron Trust',
    body: 'Seller applications and product listings undergo administrative review before going live, pairing authentic craftsmanship with verified checkout and shipment tracking.',
  },
];

const WORKFLOW_STEPS = [
  {
    step: 'Step 01',
    title: 'Artisan Verification',
    desc: 'Makers and MSMEs apply with their craft specialization and studio location. Our curatorial admin team reviews each storefront before approval.',
  },
  {
    step: 'Step 02',
    title: 'Curated Catalogue',
    desc: 'Approved studios publish handcrafted items with transparent pricing, stock counts, and regional origin details.',
  },
  {
    step: 'Step 03',
    title: 'Direct Patron Checkout',
    desc: 'Patrons browse across multiple regional studios in one cart, with server-verified Razorpay checkout and itemized order tracking.',
  },
  {
    step: 'Step 04',
    title: 'Studio Fulfillment',
    desc: 'Each artisan studio accepts, packages, and dispatches its consignment directly with courier tracking updates.',
  },
];

export default function ImpactPage() {
  useEffect(() => {
    document.title = 'Our Impact — BharatBazaar';
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--cream)' }}>
      <AnnouncementBar />
      <Navbar />

      {/* Mission Hero */}
      <section
        className="border-b border-[#E8DED2] py-16 sm:py-24 px-5 sm:px-8 lg:px-14"
        style={{ background: 'var(--cream-warm)' }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <p className="section-eyebrow" style={{ textAlign: 'center' }}>
            Mission &amp; Craft Stewardship
          </p>
          <h1
            className="text-3xl sm:text-5xl font-bold mt-2 mb-5"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--brown-dark)', lineHeight: 1.15 }}
          >
            Craft Preserved, Livelihoods Respected
          </h1>
          <span className="divider-gold mx-auto" style={{ margin: '12px auto 20px' }} />
          <p
            className="max-w-2xl mx-auto text-sm sm:text-base leading-relaxed"
            style={{ fontFamily: 'var(--font-sans)', color: 'var(--brown-mid)' }}
          >
            BharatBazaar exists to bridge India’s traditional artisan workshops with discerning
            patrons — replacing anonymous mass retail with transparent, direct-from-studio craft commerce.
          </p>
        </div>
      </section>

      <main className="flex-1">
        {/* Core Pillars */}
        <section className="px-5 sm:px-8 lg:px-14 py-16 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.eyebrow}
                className="p-7 sm:p-8 bg-white border border-[#E8DED2] space-y-3"
              >
                <span className="text-[10.5px] font-bold uppercase tracking-widest text-[#C0522B] block">
                  {pillar.eyebrow}
                </span>
                <h2
                  className="text-xl font-bold text-[#2C2C2C]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {pillar.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#4A3728] leading-relaxed">{pillar.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How BharatBazaar Works */}
        <section
          className="border-y border-[#E8DED2] px-5 sm:px-8 lg:px-14 py-16"
          style={{ background: '#FFFFFF' }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-xl mx-auto mb-12">
              <p className="section-eyebrow" style={{ textAlign: 'center' }}>
                Marketplace Architecture
              </p>
              <h2 className="section-title" style={{ textAlign: 'center' }}>
                How BharatBazaar Works
              </h2>
              <span className="divider-gold mx-auto" style={{ margin: '10px auto 16px' }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {WORKFLOW_STEPS.map((item) => (
                <div
                  key={item.step}
                  className="p-6 border border-[#E8DED2] space-y-2"
                  style={{ background: 'var(--cream)' }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#C9962A]">
                    {item.step}
                  </span>
                  <h3
                    className="text-base font-bold text-[#2C2C2C]"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#4A3728] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dual Call to Action */}
        <section className="px-5 sm:px-8 lg:px-14 py-16 max-w-5xl mx-auto">
          <div className="p-8 sm:p-12 bg-[#2C2C2C] text-white grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#C9962A]">
                Join the Craft Ecosystem
              </span>
              <h2
                className="text-2xl sm:text-3xl font-bold"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Support Handmade India
              </h2>
              <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                Whether you are looking for authentic regional heirlooms or represent an artisan
                workshop ready to reach patrons nationwide, BharatBazaar is built for you.
              </p>
            </div>
            <div className="flex flex-wrap md:justify-end gap-3">
              <Link
                to="/shop"
                className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white"
                style={{ background: 'var(--burgundy)' }}
              >
                Explore Catalogue
              </Link>
              <Link
                to="/seller/register"
                className="px-5 py-3 text-xs font-semibold uppercase tracking-wider border border-white/30 text-white hover:bg-white/10 transition-colors"
              >
                Become a Seller
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
