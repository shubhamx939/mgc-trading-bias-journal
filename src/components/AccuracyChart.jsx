import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function AccuracyChart({ data }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}><CartesianGrid stroke="#253039" vertical={false} strokeDasharray="3 5" /><XAxis dataKey="label" stroke="#8b969b" tickLine={false} axisLine={false} fontSize={11} /><YAxis domain={[0, 100]} stroke="#8b969b" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(value) => `${value}%`} /><Tooltip cursor={{ fill: 'rgba(226,178,92,.07)' }} contentStyle={{ background: '#172027', border: '1px solid #344047', borderRadius: 10, color: '#eef2ef' }} formatter={(value, name, item) => [`${value}% (${item.payload.correct}/${item.payload.total})`, 'Accuracy']} /><Bar dataKey="percent" fill="#d9a95d" radius={[5, 5, 0, 0]} maxBarSize={48} /></BarChart></ResponsiveContainer>
}
