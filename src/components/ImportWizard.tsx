'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { createClient } from '@/lib/supabase/client';
import {
  PURCHASE_FIELDS,
  VISIT_FIELDS,
  guessColumn,
  normalizeEmail,
  normalizePhone,
  normalizeService,
  normalizeStatus,
  parseDate,
  parseDateOnly,
  type ImportType,
} from '@/lib/import';

type Step = 'select' | 'map' | 'done';

interface ImportResult {
  total: number;
  created: number;
  matched: number;
  skipped: number;
  errors: string[];
}

export default function ImportWizard() {
  const [step, setStep] = useState<Step>('select');
  const [importType, setImportType] = useState<ImportType>('visits');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const fields = importType === 'visits' ? VISIT_FIELDS : PURCHASE_FIELDS;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedHeaders = results.meta.fields ?? [];
        setHeaders(parsedHeaders);
        setRows(results.data);

        const initialMapping: Record<string, string> = {};
        for (const field of fields) {
          initialMapping[field.key] = guessColumn(parsedHeaders, field.guesses);
        }
        setMapping(initialMapping);
        setStep('map');
      },
    });
  }

  async function handleImport() {
    setProcessing(true);
    const supabase = createClient();
    const outcome: ImportResult = { total: rows.length, created: 0, matched: 0, skipped: 0, errors: [] };

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('id, email, phone, arketa_id');

    const byEmail = new Map<string, string>();
    const byPhone = new Map<string, string>();
    const byArketaId = new Map<string, string>();
    for (const c of existingContacts ?? []) {
      if (c.email) byEmail.set(normalizeEmail(c.email), c.id);
      if (c.phone) byPhone.set(normalizePhone(c.phone), c.id);
      if (c.arketa_id) byArketaId.set(c.arketa_id, c.id);
    }

    for (const row of rows) {
      const name = row[mapping.name]?.trim();
      const email = normalizeEmail(row[mapping.email]);
      const phone = normalizePhone(row[mapping.phone]);
      const externalId = mapping.external_id ? row[mapping.external_id]?.trim() : '';

      if (!name) {
        outcome.skipped += 1;
        continue;
      }

      let contactId =
        (externalId && byArketaId.get(externalId)) ||
        (email && byEmail.get(email)) ||
        (phone && byPhone.get(phone));

      if (!contactId) {
        const { data: newContact, error } = await supabase
          .from('contacts')
          .insert({
            full_name: name,
            email: email || null,
            phone: row[mapping.phone] || null,
            source: 'other',
            pipeline_stage: 'active',
          })
          .select('id')
          .single();

        if (error || !newContact) {
          outcome.errors.push(`${name}: ${error?.message ?? 'failed to create contact'}`);
          continue;
        }

        const newId: string = newContact.id;
        contactId = newId;
        if (email) byEmail.set(email, newId);
        if (phone) byPhone.set(phone, newId);
        outcome.created += 1;
      } else {
        outcome.matched += 1;
      }

      if (importType === 'visits') {
        const visitDate = parseDate(row[mapping.visit_date]);
        if (!visitDate) {
          outcome.skipped += 1;
          continue;
        }
        const payload = {
          contact_id: contactId,
          visit_date: visitDate,
          service: normalizeService(row[mapping.service]),
          duration_minutes: mapping.duration_minutes ? Number(row[mapping.duration_minutes]) || null : null,
        };
        const { error } = externalId
          ? await supabase.from('visits').upsert({ ...payload, arketa_id: externalId }, { onConflict: 'arketa_id' })
          : await supabase.from('visits').insert(payload);
        if (error) outcome.errors.push(`${name}: ${error.message}`);
      } else {
        const sessionsTotal = mapping.sessions_total ? Number(row[mapping.sessions_total]) || null : null;
        const sessionsRemaining = mapping.sessions_remaining
          ? Number(row[mapping.sessions_remaining]) || null
          : sessionsTotal;
        const payload = {
          contact_id: contactId,
          name: row[mapping.item_name] || 'Unknown plan',
          item_type: sessionsTotal !== null ? 'session_pack' : 'membership',
          status: normalizeStatus(row[mapping.status]),
          purchase_date: (mapping.purchase_date && parseDateOnly(row[mapping.purchase_date])) || undefined,
          expiry_date: mapping.expiry_date ? parseDateOnly(row[mapping.expiry_date]) : null,
          price: mapping.price ? Number(row[mapping.price]) || null : null,
          sessions_total: sessionsTotal,
          sessions_remaining: sessionsRemaining,
        };
        const { error } = externalId
          ? await supabase.from('purchases').upsert({ ...payload, arketa_id: externalId }, { onConflict: 'arketa_id' })
          : await supabase.from('purchases').insert(payload);
        if (error) outcome.errors.push(`${name}: ${error.message}`);
      }
    }

    await supabase.from('csv_imports').insert({
      import_type: importType,
      filename: fileName,
      row_count: outcome.total,
      imported_by: user?.id ?? null,
    });

    setResult(outcome);
    setProcessing(false);
    setStep('done');
  }

  return (
    <div className="mt-6 space-y-6">
      {step === 'select' && (
        <div className="rounded-xl border border-slate-800 p-4">
          <label className="block text-sm text-slate-300">What are you importing?</label>
          <select
            value={importType}
            onChange={(e) => setImportType(e.target.value as ImportType)}
            className="mt-1 w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            <option value="visits">Visits / check-ins</option>
            <option value="purchases">Memberships / session packs</option>
          </select>

          <label className="mt-4 block text-sm text-slate-300">CSV file</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="mt-1 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-3 file:py-2 file:text-slate-950"
          />
        </div>
      )}

      {step === 'map' && (
        <div className="rounded-xl border border-slate-800 p-4">
          <p className="text-sm text-slate-400">
            {fileName} — {rows.length} rows detected. Match each field to a column from your CSV.
          </p>
          <div className="mt-4 space-y-3">
            {fields.map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <label className="w-56 shrink-0 text-sm text-slate-300">
                  {field.label}
                  {field.required && <span className="text-red-400"> *</span>}
                </label>
                <select
                  value={mapping[field.key] ?? ''}
                  onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  <option value="">— not in file —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep('select')}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={processing || fields.some((f) => f.required && !mapping[f.key])}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {processing ? 'Importing…' : `Import ${rows.length} rows`}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="rounded-xl border border-slate-800 p-4">
          <h2 className="text-lg font-semibold text-white">Import complete</h2>
          <dl className="mt-3 grid grid-cols-4 gap-4 text-sm">
            <Stat label="Rows" value={result.total} />
            <Stat label="Contacts created" value={result.created} />
            <Stat label="Contacts matched" value={result.matched} />
            <Stat label="Skipped" value={result.skipped} />
          </dl>
          {result.errors.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-red-400">{result.errors.length} errors</p>
              <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-400">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => {
              setStep('select');
              setResult(null);
              setRows([]);
              setHeaders([]);
            }}
            className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-xl font-semibold text-white">{value}</dd>
    </div>
  );
}
