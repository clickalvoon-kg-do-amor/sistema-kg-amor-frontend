import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

interface Props {
  rankingSupervisao: any[];
  rankingCelulas: any[];
  rankingRedes: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#B10DC9', '#FF4136', '#0074D9'];

export default function DashboardCharts({ rankingSupervisao, rankingCelulas, rankingRedes }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Supervisão */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-slate-800 font-semibold mb-4">Top 15 Supervisão</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rankingSupervisao}>
            <XAxis dataKey="supervisao" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total_kg" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Células */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-slate-800 font-semibold mb-4">Top 15 Células</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rankingCelulas}>
            <XAxis dataKey="celula" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total_kg" fill="#10B981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ranking por Rede */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 col-span-1 lg:col-span-2">
        <h3 className="text-slate-800 font-semibold mb-4">Distribuição por Rede</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={rankingRedes}
              dataKey="total_kg"
              nameKey="rede"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {rankingRedes.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
