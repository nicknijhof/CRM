'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const LINE_COLORS = ['#0d9488', '#d97706', '#0369a1', '#be123c', '#65a30d'];

export default function MonthlyTrendChart<T extends { month: string }>({
  data,
  series,
  height = 240,
}: {
  data: T[];
  series: { key: string; label: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="month" stroke="#78716c" fontSize={12} />
        <YAxis stroke="#78716c" fontSize={12} allowDecimals={false} width={40} />
        <Tooltip
          contentStyle={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: 8 }}
          labelStyle={{ color: '#1c1917' }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
