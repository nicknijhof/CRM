'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

// One color per CONTACT_SOURCES entry (9) so the palette never wraps and repeats.
const COLORS = [
  '#0d9488', // teal
  '#a78bfa', // violet
  '#34d399', // emerald
  '#fbbf24', // amber
  '#f87171', // red
  '#a8a29e', // stone
  '#38bdf8', // sky
  '#e879f9', // fuchsia
  '#fb923c', // orange
];

export default function SourceBreakdownChart({ data }: { data: { source: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="source" innerRadius={50} outerRadius={90} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#78716c' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
