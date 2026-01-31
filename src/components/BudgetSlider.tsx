"use client";

import { BudgetWithSpent } from "@/lib/types";
import { BudgetCard } from "./BudgetCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

interface BudgetSliderProps {
  budgets: BudgetWithSpent[];
  onBudgetClick: (budget: BudgetWithSpent) => void;
}

export function BudgetSlider({ budgets, onBudgetClick }: BudgetSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(budgets.length > 1);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (budgets.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800/30 rounded-xl p-4">
      <h2 className="text-lg font-bold text-white mb-4">Budget Overview</h2>
      <div className="relative">
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-slate-900/80 rounded-full p-2 backdrop-blur"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollBehavior: "smooth" }}
        >
          {budgets.map((budget) => (
            <div
              key={budget.id}
              className="shrink-0 w-72 snap-start cursor-pointer transition-transform hover:scale-105 active:scale-95"
              onClick={() => onBudgetClick(budget)}
            >
              <BudgetCard budget={budget} />
            </div>
          ))}
        </div>

        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-slate-900/80 rounded-full p-2 backdrop-blur"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
