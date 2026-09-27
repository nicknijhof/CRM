import { requireFeature } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/lib/types';
import PromoLinkForm from '@/components/PromoLinkForm';
import PromoLinkRow from '@/components/PromoLinkRow';

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'https://sochillbathclub.com';

export default async function PromoLinksPage() {
  await requireFeature('promo_links');
  const supabase = await createClient();

  const { data: links } = await supabase
    .from('products')
    .select('*')
    .eq('is_promo_link', true)
    .order('created_at', { ascending: false })
    .returns<Product[]>();

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Promo Checkout Links</h1>
        <p className="mt-1 text-sm text-stone-500">
          Standalone checkout pages for promotions — create one, send the link to whoever you want, and they can pay
          without browsing the full pricing page. Works like Arketa&apos;s checkout links.
        </p>
      </div>

      <PromoLinkForm websiteUrl={WEBSITE_URL} />

      <div className="space-y-2">
        {links?.map((link) => (
          <PromoLinkRow key={link.id} product={link} websiteUrl={WEBSITE_URL} />
        ))}
        {!links?.length && <p className="text-sm text-stone-500">No promo checkout links yet.</p>}
      </div>
    </div>
  );
}
