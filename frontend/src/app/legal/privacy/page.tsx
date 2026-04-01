import { PublicNavbar } from '@/components/public-navbar';
import { PublicFooter } from '@/components/public-footer';
import { Shield } from 'lucide-react';

export const metadata = { title: 'Privacy Policy — MA Finance Hub' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <PublicNavbar />

      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-[#2D6A4F]" />
          <h1 className="text-4xl font-extrabold text-[#2C1810]">Privacy Policy</h1>
        </div>

        <div className="mt-8 rounded-xl border border-[#D4A854] bg-[#D4A854]/10 p-6">
          <p className="text-lg font-semibold text-[#2C1810]">Under Legal Review</p>
          <p className="mt-2 text-[#5C4033]">
            Our Privacy Policy is currently being finalized by our legal team.
            This page will be updated once the review is complete. We are
            committed to protecting your data and will publish a comprehensive
            policy covering data collection, storage, sharing, and your rights.
          </p>
          <p className="mt-3 text-[#5C4033]">
            Questions? Contact us at{' '}
            <a
              href="mailto:support@maishq.com"
              className="text-[#2D6A4F] hover:underline"
            >
              support@maishq.com
            </a>.
          </p>
        </div>

        <p className="mt-6 text-sm text-[#5C4033]">
          &copy; {new Date().getFullYear()} MA Intelligent Systems LLC. All rights reserved.
        </p>
      </section>

      <PublicFooter />
    </div>
  );
}
