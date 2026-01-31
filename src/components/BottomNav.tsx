"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, BarChart3, PieChart } from "lucide-react";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/add", icon: PlusCircle, label: "Add", primary: true },
  { href: "/budgets", icon: PieChart, label: "Budgets" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 pb-safe">
      {/* Floating Dock Container */}
      <div className="max-w-md mx-auto bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl overflow-hidden">
        <div className="flex items-center justify-around h-16">
          {navItems.map(({ href, icon: Icon, label, primary }) => {
            const isActive = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-4 py-2 transition-all relative
                  ${primary ? "relative -mt-10" : ""}`}
              >
                {primary ? (
                  <div className="w-20 h-20 bg-[#FF6B6B] border-2 border-[#050505] rounded-2xl flex items-center justify-center shadow-[6px_6px_0px_0px_#050505] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none transition-all">
                    <Icon className="w-10 h-10 text-white" strokeWidth={3} />
                  </div>
                ) : (
                  <>
                    <div
                      className={`${
                        isActive ? "bg-[#050505] p-1.5 rounded-lg" : ""
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${
                          isActive ? "text-white" : "text-[#050505]"
                        }`}
                        strokeWidth={isActive ? 2 : 1.5}
                      />
                    </div>
                    <span
                      className={`text-xs font-mono font-bold ${
                        isActive
                          ? "text-[#050505]"
                          : "text-[#050505] opacity-50"
                      }`}
                    >
                      {label}
                    </span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
