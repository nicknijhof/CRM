'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ITEM_TYPES, PAYMENT_METHODS } from '@/lib/constants';
import { computeDiscount, computeSessionsTotal } from '@/lib/discounts';
import { remainingBalance } from '@/lib/payments';
import type { DiscountCode, Product } from '@/lib/types';

export default function AddPurchaseFlow({
  products,
  discountCodes,
  defaultDate,
  onCancel,
}: {
  products: Product[];
  discountCodes: DiscountCode[];
  defaultDate: string;
  onCancel: () => void;
}) {
  const [productId, setProductId] = useState('');
  const [discountCodeId, setDiscountCodeId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('0');

  const product = products.find((p) => p.id === productId) ?? null;
  const discountCode = discountCodes.find((d) => d.id === discountCodeId) ?? null;
  const regularCodes = discountCodes.filter((c) => !c.is_gift_code);
  const giftCodes = discountCodes.filter((c) => c.is_gift_code);

  const listPrice = product?.price ?? 0;
  const { discountAmount, finalPrice } = computeDiscount(listPrice, discountCode);
  const sessionsTotal = computeSessionsTotal(product?.sessions_included ?? null, discountCode);
  const remaining = remainingBalance(finalPrice, Number(amountPaid) || 0);

  function selectProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id) ?? null;
    const { finalPrice: fp } = computeDiscount(p?.price ?? 0, discountCode);
    setAmountPaid(String(fp));
  }

  function selectDiscount(id: string) {
    setDiscountCodeId(id);
    const dc = discountCodes.find((x) => x.id === id) ?? null;
    const { finalPrice: fp } = computeDiscount(listPrice, dc);
    setAmountPaid(String(fp));
  }

  // Step 1: browse products grouped by type
  if (!product) {
    const groups = ITEM_TYPES.map((type) => ({
      type,
      items: products.filter((p) => p.item_type === type.value),
    })).filter((g) => g.items.length);

    return (
      <div className="space-y-2 rounded-xl border border-stone-200 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-700">New purchase</p>
          <button type="button" onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-700">
            Cancel
          </button>
        </div>
        <div className="space-y-2">
          {groups.map(({ type, items }) => (
            <details key={type.value} className="group rounded-lg border border-stone-200">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium text-stone-700">
                {type.label}
                <ChevronDown className="h-4 w-4 text-stone-400 transition group-open:rotate-180" />
              </summary>
              <div className="divide-y divide-stone-100 border-t border-stone-200">
                {items.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProduct(p.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-50"
                  >
                    <span className="text-stone-900">{p.name}</span>
                    <span className="text-stone-500">${p.price}</span>
                  </button>
                ))}
              </div>
            </details>
          ))}
          {!groups.length && <p className="px-1 py-2 text-sm text-stone-400">No products configured yet.</p>}
        </div>
      </div>
    );
  }

  // Step 2: cart / checkout
  return (
    <div className="space-y-3 rounded-xl border border-stone-200 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-700">New purchase</p>
        <button type="button" onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-700">
          Cancel
        </button>
      </div>

      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="discount_code_id" value={discountCodeId} />

      <div className="rounded-lg bg-stone-100 px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-stone-900">{product.name}</p>
          <p className="text-sm text-stone-700">${product.price}</p>
        </div>
        <button
          type="button"
          onClick={() => setProductId('')}
          className="mt-1 text-xs text-teal-600 hover:text-teal-700"
        >
          ← Change item
        </button>
      </div>

      <div>
        <label className="block text-sm text-stone-700">Date</label>
        <input
          name="purchase_date"
          type="date"
          defaultValue={defaultDate}
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-stone-700">Discount code</label>
          <select
            value={discountCode && !discountCode.is_gift_code ? discountCodeId : ''}
            onChange={(e) => selectDiscount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
          >
            <option value="">— no discount —</option>
            {regularCodes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-stone-700">Gift card</label>
          <select
            value={discountCode?.is_gift_code ? discountCodeId : ''}
            onChange={(e) => selectDiscount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
          >
            <option value="">— none —</option>
            {giftCodes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.label}
              </option>
            ))}
          </select>
          <p className="mt-0.5 text-xs text-stone-500">
            {giftCodes.length
              ? 'Make sure the code matches this item before applying it.'
              : 'No unredeemed gift codes right now.'}
          </p>
        </div>
      </div>

      {product.item_type === 'gift_card' && (
        <div>
          <label className="block text-sm text-stone-700">Recipient email</label>
          <p className="mt-0.5 text-xs text-stone-500">
            A one-time gift code will be generated after saving — copy it and send it to them yourself (email sending
            isn&apos;t connected yet).
          </p>
          <input
            name="gift_recipient_email"
            type="email"
            required
            placeholder="friend@example.com"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
          />
        </div>
      )}

      <div className="rounded-lg bg-stone-100 px-3 py-2 text-sm">
        {discountAmount > 0 ? (
          <p>
            Total due: <span className="text-stone-500 line-through">${listPrice.toFixed(2)}</span>{' '}
            <span className="font-semibold text-stone-900">${finalPrice.toFixed(2)}</span>
          </p>
        ) : (
          <p>
            Total due: <span className="font-semibold text-stone-900">${finalPrice.toFixed(2)}</span>
          </p>
        )}
        {sessionsTotal !== null && (
          <p className="mt-1 text-stone-500">
            Sessions: <span className="font-semibold text-stone-900">{sessionsTotal}</span>
            {discountCode && discountCode.bonus_sessions > 0 && (
              <span className="text-emerald-600"> (+{discountCode.bonus_sessions} bonus)</span>
            )}
          </p>
        )}
      </div>

      {finalPrice > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-stone-700">Paid via</label>
            <select
              name="payment_method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-stone-700">Amount paid</label>
            <input
              name="amount_paid"
              type="number"
              step="0.01"
              min="0"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700">Remaining</label>
            <p
              className={`mt-1 rounded-lg border border-stone-300 px-3 py-2 font-medium ${
                remaining === 0 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              ${remaining.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
        Complete sale
      </button>
    </div>
  );
}
