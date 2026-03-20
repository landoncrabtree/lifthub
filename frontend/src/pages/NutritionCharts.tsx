import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, Area, AreaChart,
} from 'recharts';
import { Scale, TrendingUp, Flame, Plus } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { post } from '@/api/client';
import { hapticLight } from '@/lib/haptics';
import type { NutritionChartData } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { SectionNav } from '@/components/ui/SectionNav';
import { nutritionNavItems } from '@/lib/navigation';

const tooltipStyle = {
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  fontSize: '12px',
};

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function NutritionCharts() {
  const { data, loading, error, refetch } = useFetch<NutritionChartData>('/nutrition/charts');

  const [weightModal, setWeightModal] = useState(false);
  const [weightDate, setWeightDate] = useState(todayStr);
  const [weightLbs, setWeightLbs] = useState('');
  const [weightNotes, setWeightNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogWeight() {
    if (!weightLbs) return;
    setSubmitting(true);
    try {
      await post('/nutrition/weight-log', {
        date: weightDate,
        weight_lbs: parseFloat(weightLbs),
        notes: weightNotes || undefined,
      });
      setWeightModal(false);
      hapticLight();
      setWeightLbs('');
      setWeightNotes('');
      setWeightDate(todayStr());
      refetch();
    } catch {
      // Error handled silently; user can retry
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-7 w-48" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-[280px] w-full rounded-lg" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      </div>
    );
  }

  const weightData = (data?.weight_trend ?? []).map((w) => ({
    date: new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    weight: w.weight_lbs,
  }));

  const energyData = (data?.energy_balance ?? []).map((e) => ({
    date: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    consumed: e.consumed,
    tdee: e.tdee,
    balance: e.balance,
  }));

  const calorieData = (data?.calorie_history ?? []).map((c) => ({
    date: new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    calories: c.calories,
    target: c.target,
  }));

  const calorieTarget = calorieData.length > 0 ? calorieData[0].target : undefined;

  return (
    <div className="space-y-6">
      <Header />

      {/* Weight Trend */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-brand-400" />
              <h3 className="text-base font-semibold text-[var(--color-text)]">Weight Trend</h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setWeightModal(true)}
            >
              Log Weight
            </Button>
          </div>
        }
      >
        {weightData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center">
            <p className="text-sm text-[var(--color-text-tertiary)]">No weight data yet. Log your first weight entry!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                  <YAxis
                    domain={['dataMin - 2', 'dataMax + 2']}
                    tick={{ fontSize: 11 }}
                    stroke="var(--color-text-tertiary)"
                    unit=" lbs"
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#6366f1' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Card>

      {/* Energy Balance */}
      <Card
        header={
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-400" />
            <h3 className="text-base font-semibold text-[var(--color-text)]">Energy Balance</h3>
          </div>
        }
      >
        {energyData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center">
            <p className="text-sm text-[var(--color-text-tertiary)]">No energy data available yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={energyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" unit=" cal" />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => {
                      if (name === 'balance') {
                        const label = value >= 0 ? 'Surplus' : 'Deficit';
                        return [`${Math.abs(value)} cal (${label})`, 'Balance'];
                      }
                      return [`${value} cal`, name === 'consumed' ? 'Consumed' : 'TDEE'];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="consumed" fill="#6366f1" name="Consumed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tdee" fill="var(--color-text-tertiary)" name="TDEE" radius={[4, 4, 0, 0]} opacity={0.4} />
                </BarChart>
              </ResponsiveContainer>

              {/* Balance annotations */}
              <div className="mt-3 flex flex-wrap gap-2">
                {energyData.slice(-7).map((d) => (
                  <div key={d.date} className="flex flex-col items-center text-xs">
                    <span className="text-[var(--color-text-tertiary)]">{d.date}</span>
                    <span className={d.balance >= 0 ? 'font-medium text-green-500' : 'font-medium text-red-500'}>
                      {d.balance >= 0 ? '+' : ''}{d.balance}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Calorie History */}
      <Card
        header={
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            <h3 className="text-base font-semibold text-[var(--color-text)]">Calorie History (30 days)</h3>
          </div>
        }
      >
        {calorieData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center">
            <p className="text-sm text-[var(--color-text-tertiary)]">No calorie data available yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={calorieData}>
                  <defs>
                    <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" unit=" cal" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  {calorieTarget != null && (
                    <ReferenceLine
                      y={calorieTarget}
                      stroke="#f59e0b"
                      strokeDasharray="6 3"
                      strokeWidth={2}
                      label={{ value: `Target: ${calorieTarget}`, position: 'right', fontSize: 11, fill: '#f59e0b' }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="calories"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#calorieGradient)"
                    name="Calories"
                    dot={{ r: 2, fill: '#6366f1' }}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Card>

      {/* Log Weight Modal */}
      <Modal
        open={weightModal}
        onClose={() => setWeightModal(false)}
        title="Log Weight"
        footer={
          <>
            <Button variant="secondary" onClick={() => setWeightModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogWeight} loading={submitting} disabled={!weightLbs}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={weightDate}
            onChange={(e) => setWeightDate(e.target.value)}
          />
          <Input
            label="Weight (lbs)"
            type="number"
            step="0.1"
            placeholder="e.g. 175.5"
            value={weightLbs}
            onChange={(e) => setWeightLbs(e.target.value)}
          />
          <Input
            label="Notes (optional)"
            placeholder="e.g. Morning weigh-in"
            value={weightNotes}
            onChange={(e) => setWeightNotes(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}

function Header() {
  return (
    <>
      <SectionNav items={nutritionNavItems} />
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Nutrition Progress</h1>
    </>
  );
}
