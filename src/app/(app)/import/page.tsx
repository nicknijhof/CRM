import ImportWizard from '@/components/ImportWizard';

export default function ImportPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-stone-900">Import from Arketa</h1>
      <p className="mt-1 text-sm text-stone-500">
        Export a CSV of visits (check-ins) or memberships from Arketa, then upload it here. New
        clients are created automatically and matched to existing contacts by email or phone.
      </p>
      <ImportWizard />
    </div>
  );
}
