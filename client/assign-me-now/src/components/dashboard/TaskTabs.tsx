import { motion } from "framer-motion";

export const tabs = ["All", "Pending", "In Progress", "Done"] as const;
export type TabValue = (typeof tabs)[number];

export const statusMap: Record<TabValue, string | undefined> = {
  "All": undefined,
  "Pending": "pending",
  "In Progress": "inprogress",
  "Done": "done",
};

interface Props {
  active: TabValue;
  onChange: (tab: TabValue) => void;
  counts: Record<TabValue, number>;
}

export function TaskTabs({ active, onChange, counts }: Props) {
  return (
    <div className="flex gap-6 border-b border-border mb-8">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`relative pb-3 text-sm font-medium transition-colors ${
            active === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
          }`}
        >
          {tab}
          <span className="ml-1.5 text-[11px] text-muted-foreground">{counts[tab]}</span>
          {active === tab && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
