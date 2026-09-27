'use client';

import { useState } from 'react';
import { deletePromoLink, setPromoLinkActive } from '@/app/(app)/promo-links/actions';
import type { Product } from '@/lib/types';

function formatMoney(amount: number): string {
  return `S$${amount.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PromoLinkRow({ product, websiteUrl }: { product: Product; websiteUrl: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${websiteUrl}/checkout/${product.slug}`;
  const expired = product.promo_expires_at ? new Date(product.promo_expires_at) < new Date() : false;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the link is still shown as text below to copy manually
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        {product.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
        )}
        <div className="flex-1">
          <p className="font-medium text-stone-900">
            {product.name} <span className="font-normal text-stone-500">— {formatMoney(product.price)}</span>
            {product.item_type === 'membership' && <span className="font-normal text-stone-500"> / month</span>}
          </p>
          <p className="text-stone-500">
            {product.item_type === 'membership'
              ? 'Recurring monthly'
              : product.validity_days
                ? `One-time · valid ${product.validity_days} days after purchase`
                : 'One-time'}
            {' · '}
            {product.payment_provider === 'stripe' ? 'Stripe' : 'Qashier'}
            {product.promo_expires_at &&
              ` · Link ${expired ? 'expired' : 'expires'} ${new Date(product.promo_expires_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <form action={setPromoLinkActive.bind(null, product.id, !product.is_active)}>
            <button
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                product.is_active && !expired ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
              }`}
            >
              {product.is_active ? 'Active' : 'Inactive'}
            </button>
          </form>
          <form
            action={deletePromoLink.bind(null, product.id)}
            onSubmit={(e) => {
              if (!confirm(`Delete "${product.name}"? This can't be undone.`)) e.preventDefault();
            }}
          >
            <button className="text-xs text-rose-600 underline hover:text-rose-700">Delete</button>
          </form>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2">
        <code className="flex-1 truncate text-xs text-stone-600">{url}</code>
        <button
          type="button"
          onClick={copyLink}
          className="shrink-0 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 hover:bg-stone-100"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
