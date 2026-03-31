'use client';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export function PublicNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-[#E8DCC8] bg-[#1B4332]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-xl font-bold text-white">
          MA Finance Hub
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/#features" className="text-sm text-white/80 hover:text-white">
            Features
          </Link>
          <Link href="/#pricing" className="text-sm text-white/80 hover:text-white">
            Pricing
          </Link>
          <Link href="/about" className="text-sm text-white/80 hover:text-white">
            About
          </Link>
          <Link
            href="/login"
            className="text-sm text-white/80 hover:text-white"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-[#2D6A4F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#40916C]"
          >
            Start Free Trial
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="text-white md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-white/10 bg-[#1B4332] px-6 pb-4 md:hidden">
          <Link href="/#features" className="block py-2 text-sm text-white/80 hover:text-white" onClick={() => setOpen(false)}>
            Features
          </Link>
          <Link href="/#pricing" className="block py-2 text-sm text-white/80 hover:text-white" onClick={() => setOpen(false)}>
            Pricing
          </Link>
          <Link href="/about" className="block py-2 text-sm text-white/80 hover:text-white" onClick={() => setOpen(false)}>
            About
          </Link>
          <Link href="/login" className="block py-2 text-sm text-white/80 hover:text-white" onClick={() => setOpen(false)}>
            Login
          </Link>
          <Link
            href="/register"
            className="mt-2 inline-block rounded-md bg-[#2D6A4F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#40916C]"
            onClick={() => setOpen(false)}
          >
            Start Free Trial
          </Link>
        </div>
      )}
    </nav>
  );
}
