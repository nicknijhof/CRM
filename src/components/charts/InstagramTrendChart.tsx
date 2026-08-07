'use client';

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function InstagramTrendChart({ data }: { data: { date: string; followers: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="date" stroke="#78716c" fontSize={12} />
        <YAxis stroke="#78716c" fontSize={12} allowDecimals={false} width={50} />
        <Tooltip
          contentStyle={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: 8 }}
          labelStyle={{ color: '#1c1917' }}
        />
        <Line type="monotone" dataKey="followers" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
