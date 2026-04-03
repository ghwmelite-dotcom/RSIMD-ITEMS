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
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Issue Categories</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={item.category_name}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700">
                <span className="font-medium text-gray-500 mr-2">{index + 1}.</span>
                {item.category_name}
              </span>
              <span className="font-semibold text-gray-900">{item.count}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-ghana-green rounded-full h-2 transition-all"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-sm text-gray-400">No data available</p>
        )}
      </div>
    </Card>
  );
}
