import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t border-[#E8DCC8] bg-[#1B4332] text-white/80">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:grid-cols-3">
        {/* Branding */}
        <div>
          <p className="text-lg font-bold text-white">MA Finance Hub</p>
          <p className="mt-1 text-sm">Powered by MAiSHQ</p>
          <p className="mt-3 text-xs text-white/60">
            &copy; {new Date().getFullYear()} MA Intelligent Systems LLC. All rights reserved.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/#pricing" className="hover:text-white">Pricing</Link>
          <Link href="/about" className="hover:text-white">About</Link>
          <Link href="/legal/terms" className="hover:text-white">Terms of Service</Link>
          <Link href="/legal/privacy" className="hover:text-white">Privacy Policy</Link>
          <Link href="/legal/disclaimer" className="hover:text-white">Disclaimer</Link>
        </div>

        {/* Contact */}
        <div className="text-sm">
          <p className="font-semibold text-white">Contact</p>
          <p className="mt-2">Odessa, TX</p>
          <p className="mt-1">
            <a href="mailto:support@maishq.com" className="hover:text-white">
              support@maishq.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
