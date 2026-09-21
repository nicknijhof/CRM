import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canCustomizeNav, canManageTeam, getCurrentProfile } from '@/lib/profile';
import { CUSTOMIZABLE_NAV_ITEMS } from '@/lib/nav';
import type { Profile } from '@/lib/types';
import { CONFIGURABLE_ROLES, FEATURES, FEATURE_GROUPS, getAllowedFeatures } from '@/lib/permissions';
import {
  addTeamMember,
  removeTeamMember,
  resetRoleFeatures,
  resetVisibleNavItems,
  updateRoleFeatures,
  updateTeamMemberRole,
  updateVisibleNavItems,
} from './actions';

export default async function SettingsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile || !canCustomizeNav(profile.role)) redirect('/');

  const canManage = canManageTeam(profile.role);
  const selectedIds = new Set(profile.visible_nav_items ?? CUSTOMIZABLE_NAV_ITEMS.map((item) => item.id));

  const roleAccess = canManage
    ? await Promise.all(
        CONFIGURABLE_ROLES.map(async (r) => ({ ...r, allowed: await getAllowedFeatures(r.id) })),
      )
    : [];

  let team: { id: string; full_name: string | null; role: Profile['role']; email: string | null }[] = [];
  if (canManage) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at')
      .returns<Profile[]>();
    const admin = createAdminClient();
    team = await Promise.all(
      (profiles ?? []).map(async (p) => {
        const { data } = await admin.auth.admin.getUserById(p.id);
        return { id: p.id, full_name: p.full_name, role: p.role, email: data.user?.email ?? null };
      }),
    );
  }

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Settings</h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage your sidebar{canManage ? ' and team access' : ''}.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">My sidebar</h2>
        <p className="mt-1 text-xs text-stone-500">
          Choose which sections show up in your own sidebar right now. Dashboard and Settings always stay visible.
        </p>
        <form action={updateVisibleNavItems} className="mt-3 space-y-2 rounded-xl border border-stone-200 p-4">
          {CUSTOMIZABLE_NAV_ITEMS.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                name="nav_items"
                value={item.id}
                defaultChecked={selectedIds.has(item.id)}
                className="rounded border-stone-300 text-teal-600 focus:ring-teal-500"
              />
              {item.label}
            </label>
          ))}
          <div className="flex gap-3 pt-2">
            <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Save
            </button>
            <button
              formAction={resetVisibleNavItems}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
            >
              Show all
            </button>
          </div>
        </form>
      </section>

      {canManage && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">What each login can see</h2>
          <p className="mt-1 text-xs text-stone-500">
            Choose which pages the shared Staff and Marketing logins can open. Anything switched off disappears from
            their sidebar and is blocked if they try the address directly. Owner and admin always see everything.
            Editing discount codes and the cafe menu, push notifications and data exports stay owner/admin-only.
          </p>
          <div className="mt-3 space-y-4">
            {roleAccess.map((r) => (
              <form
                key={r.id}
                action={updateRoleFeatures.bind(null, r.id)}
                className="rounded-xl border border-stone-200 p-4"
              >
                <h3 className="text-sm font-semibold text-stone-900">{r.label}</h3>
                <div className="mt-3 space-y-4">
                  {FEATURE_GROUPS.map((group) => {
                    const items = FEATURES.filter((f) => f.group === group);
                    if (!items.length) return null;
                    return (
                      <div key={group}>
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{group}</p>
                        <div className="mt-1.5 space-y-1.5">
                          {items.map((f) => (
                            <label key={f.id} className="flex items-start gap-2 text-sm text-stone-700">
                              <input
                                type="checkbox"
                                name="features"
                                value={f.id}
                                defaultChecked={r.allowed.has(f.id)}
                                className="mt-0.5 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
                              />
                              <span>
                                {f.label}
                                <span className="block text-xs text-stone-400">{f.hint}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-4">
                  <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                    Save {r.label.toLowerCase()}
                  </button>
                  <button
                    formAction={resetRoleFeatures.bind(null, r.id)}
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
                  >
                    Reset to default
                  </button>
                </div>
              </form>
            ))}
          </div>
        </section>
      )}

      {canManage && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Team</h2>
          <p className="mt-1 text-xs text-stone-500">
            Grant admin, staff, or marketing access by email. If they don&apos;t have a login yet, they&apos;ll get
            an invite email; if they already do (even as a member-app customer), access is granted immediately.
          </p>
          <form
            action={addTeamMember}
            className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-stone-200 p-4"
          >
            <div>
              <label className="block text-xs text-stone-500">Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="name@example.com"
                className="mt-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500">Role</label>
              <select
                name="role"
                defaultValue="staff"
                className="mt-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>
            <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Add to team
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {team.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 px-4 py-2 text-sm"
              >
                <div>
                  <p className="text-stone-900">{m.full_name || m.email || m.id}</p>
                  {m.full_name && m.email && <p className="text-xs text-stone-500">{m.email}</p>}
                </div>
                {m.role === 'owner' ? (
                  <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-medium text-teal-700">Owner</span>
                ) : m.id === profile.id ? (
                  <span className="rounded-full bg-stone-200 px-2 py-1 text-xs font-medium capitalize text-stone-700">
                    {m.role} (you)
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <form action={updateTeamMemberRole.bind(null, m.id)} className="flex items-center gap-1.5">
                      <select
                        name="role"
                        defaultValue={m.role}
                        className="rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700"
                      >
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                        <option value="marketing">Marketing</option>
                      </select>
                      <button className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-100">
                        Update
                      </button>
                    </form>
                    <form action={removeTeamMember.bind(null, m.id)}>
                      <button className="text-xs text-rose-600 underline hover:text-rose-700">Remove</button>
                    </form>
                  </div>
                )}
              </div>
            ))}
            {!team.length && <p className="text-sm text-stone-400">No team members yet.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
