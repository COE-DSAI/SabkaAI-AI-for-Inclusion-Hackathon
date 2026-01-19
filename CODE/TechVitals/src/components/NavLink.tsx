import React from "react";
import { NavLink as RouterNavLink } from "react-router-dom";
import cn from "classnames";

export function NavLink({
  to,
  children,
  className,
  activeClassName = "",
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
}) {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive, isPending }) =>
        cn(
          "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
          isActive ? ["bg-[#2A2525] text-white ring-1 ring-[#8A0000]", activeClassName] : "text-white/90 hover:bg-white/6",
          className
        )
      }
    >
      {children}
    </RouterNavLink>
  );
}
