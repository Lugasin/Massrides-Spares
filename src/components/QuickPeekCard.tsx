import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function QuickPeekCard({ machine }) {
  return (
    <motion.div
      className="relative bg-white rounded-lg overflow-hidden shadow-lg"
      whileHover="hover"
      initial="rest"
      animate="rest"
    >
      <img src={machine.img} alt="" loading="lazy" />
      <motion.div
        variants={{
          rest: { y: "100%" },
          hover: { y: 0 }
        }}
        className="absolute bottom-0 left-0 w-full bg-white/90 p-4"
      >
        <h4 className="font-semibold">{machine.name}</h4>
        <p className="text-gray-600 text-sm">{machine.specs.slice(0, 60)}…</p>
        <Button size="sm" className="mt-2 w-full bg-green-600">
          Add to Quote
        </Button>
      </motion.div>
    </motion.div>
  );
}
