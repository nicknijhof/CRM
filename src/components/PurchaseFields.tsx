'use client';

import { useState } from 'react';
import { ITEM_TYPES, PAYMENT_METHODS } from '@/lib/constants';
import { computeDiscount, computeSessionsTotal } from '@/lib/discounts';
import { remainingBalance } from '@/lib/payments';
import type { DiscountCode, Product } from '@/lib/types';

export default function PurchaseFields({
  products,
  discountCodes,
  defaultDate,
}: {
  products: Product[];
  discountCodes: DiscountCode[];
  defaultDate: string;
}) {
  const [productId, setProductId] = useState('');
  const [discountCodeId, setDiscountCodeId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('0');

  const product = products.find((p) => p.id === productId) ?? null;
  const discountCode = discountCodes.find((d) => d.id === discountCodeId) ?? null;
  const listPrice = product?.price ?? 0;
  const { discountAmount, finalPrice } = computeDiscount(listPrice, discountCode);
  const sessionsTotal = computeSessionsTotal(product?.sessions_included ?? null, discountCode);
  const remaining = remainingBalance(finalPrice, Number(amountPaid) || 0);

  function handleProductChange(newProductId: string) {
    setProductId(newProductId);
    const newProduct = products.find((p) => p.id === newProductId) ?? null;
    const { finalPrice: newFinalPrice } = computeDiscount(newProduct?.price ?? 0, discountCode);
    setAmountPaid(String(newFinalPrice));
  }

  function handleDiscountChange(newDiscountCodeId: string) {
    setDiscountCodeId(newDiscountCodeId);
    const newDiscountCode = discountCodes.find((d) => d.id === newDiscountCodeId) ?? null;
    const { finalPrice: newFinalPrice } = computeDiscount(listPrice, newDiscountCode);
    setAmountPaid(String(newFinalPrice));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-slate-300">Purchase</label>
          <select
            name="product_id"
            value={productId}
            onChange={(e) => handleProductChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            <option value="">— none —</option>
            {ITEM_TYPES.map((type) => {
              const group = products.filter((p) => p.item_type === type.value);
              if (!group.length) return null;
              return (
                <optgroup key={type.value} label={type.label}>
                  {group.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.price}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-300">Discount code</label>
          <select
            name="discount_code_id"
            value={discountCodeId}
            onChange={(e) => handleDiscountChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            <option value="">— no discount —</option>
            {discountCodes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-300">Date</label>
          <input
            name="purchase_date"
            type="date"
            defaultValue={defaultDate}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </div>
      </div>

      {product?.item_type === 'gift_card' && (
        <div>
          <label className="block text-sm text-slate-300">Recipient email</label>
          <p className="mt-0.5 text-xs text-slate-500">
            A one-time gift code will be generated after saving — copy it and send it to them
            yourself (email sending isn&apos;t connected yet).
          </p>
          <input
            name="gift_recipient_email"
            type="email"
            required
            placeholder="friend@example.com"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </div>
      )}

      {product && (
        <div className="rounded-lg bg-slate-900 px-3 py-2 text-sm">
          {discountAmount > 0 ? (
            <p>
              Total due: <span className="text-slate-500 line-through">${listPrice.toFixed(2)}</span>{' '}
              <span className="font-semibold text-white">${finalPrice.toFixed(2)}</span>
            </p>
          ) : (
            <p>
              Total due: <span className="font-semibold text-white">${finalPrice.toFixed(2)}</span>
            </p>
          )}
          {sessionsTotal !== null && (
            <p className="mt-1 text-slate-400">
              Sessions:{' '}
              <span className="font-semibold text-white">{sessionsTotal}</span>
              {discountCode && discountCode.bonus_sessions > 0 && (
                <span className="text-emerald-400"> (+{discountCode.bonus_sessions} bonus)</span>
              )}
            </p>
          )}
        </div>
      )}

      {product && finalPrice > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-slate-300">Paid via</label>
            <select
              name="payment_method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300">Amount paid</label>
            <input
              name="amount_paid"
              type="number"
              step="0.01"
              min="0"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300">Remaining</label>
            <p
              className={`mt-1 rounded-lg border border-slate-700 px-3 py-2 font-medium ${
                remaining === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              ${remaining.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
