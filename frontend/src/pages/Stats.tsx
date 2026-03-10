import { useState } from 'react';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { SectionNav } from '@/components/ui/SectionNav';
import { workoutNavItems } from '@/lib/navigation';
import History from './History';
import Progress from './Progress';

const tabItems = [
  { label: 'History', value: 'history' },
  { label: 'Progress', value: 'progress' },
];

export default function Stats() {
  const [activeTab, setActiveTab] = useState('history');

  return (
    <div className="space-y-6">
      <SectionNav items={workoutNavItems} />
      <Tabs tabs={tabItems} value={activeTab} onChange={setActiveTab} />
      <TabPanel value="history" activeValue={activeTab}>
        <History />
      </TabPanel>
      <TabPanel value="progress" activeValue={activeTab}>
        <Progress />
      </TabPanel>
    </div>
  );
}
