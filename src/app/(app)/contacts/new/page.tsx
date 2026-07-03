import { createContact } from '../actions';
import { CONTACT_SOURCES, PIPELINE_STAGES } from '@/lib/constants';

export default function NewContactPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-white">Add contact</h1>

      <form action={createContact} className="mt-6 space-y-4">
        <Field label="Full name" name="full_name" required />
        <Field label="Email" name="email" type="email" />
        <Field label="Phone" name="phone" />

        <div>
          <label className="block text-sm text-slate-300">Source</label>
          <select
            name="source"
            defaultValue="instagram"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            {CONTACT_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-300">Pipeline stage</label>
          <select
            name="pipeline_stage"
            defaultValue="lead"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-300">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950 hover:bg-cyan-400"
        >
          Save contact
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-300">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-500"
      />
    </div>
  );
}
