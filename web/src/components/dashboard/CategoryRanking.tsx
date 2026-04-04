import { Card } from "../ui/Card";

interface CategoryData {
  category_name: string;
  count: number;
}

interface CategoryRankingProps {
  data: CategoryData[];
}

export function CategoryRanking({ data }: CategoryRankingProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card className="flex flex-col">
      <h3 className="font-display text-sm font-semibold text-surface-900 dark:text-surface-100 uppercase tracking-wider mb-3">
        Top Issues
      </h3>
      <div className="flex-1 overflow-y-auto max-h-[320px] space-y-2.5">
        {data.length === 0 ? (
          <p className="text-xs text-surface-500 py-4 text-center font-mono">No data</p>
        ) : (
          data.map((item, index) => (
            <div key={item.category_name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-surface-700 dark:text-surface-300 truncate pr-2">
                  <span className="font-mono text-[10px] text-surface-400 mr-1.5">{String(index + 1).padStart(2, "0")}</span>
                  {item.category_name}
                </span>
                <span className="font-mono text-xs font-bold text-neon-green flex-shrink-0">{item.count}</span>
              </div>
              <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-1.5">
                <div
                  className="bg-neon-green/60 rounded-full h-1.5 transition-all"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
