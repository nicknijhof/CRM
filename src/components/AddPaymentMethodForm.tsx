'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { createSetupIntent, savePaymentMethod } from '@/app/(app)/contacts/payment-actions';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function AddPaymentMethodForm({ contactId, onSaved }: { contactId: string; onSaved: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createSetupIntent(contactId)
      .then((res) => setClientSecret(res.clientSecret))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to start card setup'));
  }, [contactId]);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!clientSecret) return <p className="text-sm text-stone-400">Loading card form…</p>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CardForm contactId={contactId} onSaved={onSaved} />
    </Elements>
  );
}

function CardForm({ contactId, onSaved }: { contactId: string; onSaved: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Card could not be saved');
      setSubmitting(false);
      return;
    }

    if (setupIntent?.payment_method) {
      try {
        await savePaymentMethod(contactId, setupIntent.payment_method as string);
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Card was saved with Stripe but failed to link to this member');
      }
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Save card'}
      </button>
    </form>
  );
}
