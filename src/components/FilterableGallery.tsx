import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { QuickPeekCard } from "./QuickPeekCard"; // Import QuickPeekCard

interface Machine { id: number; name: string; category: string; price: number; img: string; stock: boolean; specs: string; } // Added specs to interface

export function FilterableGallery({ machines }: { machines: Machine[] }) {
  const [filters, setFilters] = useState<{ [cat: string]: boolean }>({});

  const categories = Array.from(new Set(machines.map(m => m.category)));
  const filtered = useMemo(() => {
    const active = Object.keys(filters).filter(k => filters[k]);
    if (!active.length) return machines;
    return machines.filter(m => active.includes(m.category));
  }, [machines, filters]);

  return (
    <div className="px-4 py-8">
      <div className="flex flex-wrap gap-4 mb-6">
        {categories.map(cat => (
          <label key={cat} className="flex items-center space-x-2">
            <Checkbox
              checked={filters[cat] || false}
              onCheckedChange={(v) => setFilters(f => ({ ...f, [cat]: !!v }))}
            />
            <span className="capitalize">{cat}</span>
          </label>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((m) => (
          <QuickPeekCard key={m.id} machine={m} /> // Use QuickPeekCard here
        ))}
      </div>
    </div>
  );
}
