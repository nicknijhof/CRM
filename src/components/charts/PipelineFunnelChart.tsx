'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function PipelineFunnelChart({ data }: { data: { stage: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
        <XAxis type="number" stroke="#78716c" fontSize={12} allowDecimals={false} />
        <YAxis type="category" dataKey="stage" stroke="#78716c" fontSize={12} width={70} />
        <Tooltip
          contentStyle={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: 8 }}
          labelStyle={{ color: '#1c1917' }}
        />
        <Bar dataKey="count" fill="#0d9488" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
