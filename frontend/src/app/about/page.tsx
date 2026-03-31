import { PublicNavbar } from '@/components/public-navbar';
import { PublicFooter } from '@/components/public-footer';
import { Building2, Target, Boxes } from 'lucide-react';

export const metadata = { title: 'About — MA Finance Hub' };

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <PublicNavbar />

      <section className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-extrabold text-[#5C4033]">About Us</h1>
        <p className="mt-4 text-lg text-[#8B7355]">
          MA Intelligent Systems LLC builds software that helps small and
          mid-sized businesses operate more efficiently.
        </p>

        {/* Mission */}
        <div className="mt-12 flex gap-4">
          <Target className="mt-1 h-8 w-8 flex-shrink-0 text-[#2D6A4F]" />
          <div>
            <h2 className="text-2xl font-bold text-[#5C4033]">Our Mission</h2>
            <p className="mt-2 text-[#8B7355]">
              To deliver enterprise-grade business tools at a price point that
              growing companies can afford. We believe every business deserves
              accurate financials, streamlined operations, and data they truly
              own.
            </p>
          </div>
        </div>

        {/* Company */}
        <div className="mt-10 flex gap-4">
          <Building2 className="mt-1 h-8 w-8 flex-shrink-0 text-[#2D6A4F]" />
          <div>
            <h2 className="text-2xl font-bold text-[#5C4033]">The Company</h2>
            <p className="mt-2 text-[#8B7355]">
              MA Intelligent Systems LLC is headquartered in Odessa, TX. We
              design, develop, and operate cloud-based SaaS products under the
              MAiSHQ brand. Our engineering team focuses on security,
              multi-tenancy, and compliance-first architecture.
            </p>
          </div>
        </div>

        {/* Products */}
        <div className="mt-10 flex gap-4">
          <Boxes className="mt-1 h-8 w-8 flex-shrink-0 text-[#2D6A4F]" />
          <div>
            <h2 className="text-2xl font-bold text-[#5C4033]">Our Products</h2>
            <ul className="mt-3 space-y-3 text-[#8B7355]">
              <li>
                <span className="font-semibold text-[#5C4033]">MA Finance Hub</span>{' '}
                — Full-featured ERP covering accounting, invoicing, inventory,
                payroll, manufacturing, and CRM.
              </li>
              <li>
                <span className="font-semibold text-[#5C4033]">ChiroBill</span>{' '}
                — Chiropractic practice management and billing platform with
                insurance claims processing.
              </li>
              <li>
                <span className="font-semibold text-[#5C4033]">INIP</span>{' '}
                — Intelligent Network Infrastructure Platform for IT asset
                management and monitoring.
              </li>
            </ul>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-10 rounded-xl border border-[#E8DCC8] bg-white p-6">
          <h2 className="text-xl font-bold text-[#5C4033]">Contact</h2>
          <p className="mt-2 text-[#8B7355]">
            Email:{' '}
            <a href="mailto:support@maishq.com" className="text-[#2D6A4F] hover:underline">
              support@maishq.com
            </a>
          </p>
          <p className="mt-1 text-[#8B7355]">Location: Odessa, TX</p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
