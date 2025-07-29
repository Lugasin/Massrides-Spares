import { useQuote } from "@/context/QuoteContext";
import { Button } from "@/components/ui/button";

export function SidebarQuote() {
  const { items, total, removeItem } = useQuote();
  return (
    <aside className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg p-4 transform translate-x-full md:translate-x-0 transition-transform">
      <h3 className="text-xl font-bold mb-4">Quote Cart</h3>
      <ul className="space-y-3 mb-4 overflow-y-auto max-h-[60vh]">
        {items.map(i => (
          <li key={i.id} className="flex justify-between">
            <span>{i.name}</span>
            <button onClick={() => removeItem(i.id)} className="text-red-500">×</button>
          </li>
        ))}
      </ul>
      <p className="font-semibold mb-4">Est. Total: ${total}</p>
      <Button className="w-full bg-green-700">Proceed to Checkout</Button>
    </aside>
  );
}
