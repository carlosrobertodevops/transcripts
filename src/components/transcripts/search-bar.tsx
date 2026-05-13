"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onChange: (query: string) => void;
  placeholder?: string;
}

export const SearchBar = ({
  onChange,
  placeholder = "Buscar por título, operação, datas, análise, mídia ou status...",
}: SearchBarProps) => {
  const [value, setValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(value);
    }, 200);
    return () => clearTimeout(timer);
  }, [value, onChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative flex-1 min-w-0 max-w-xl">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        id="search-input"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-10 pr-16"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none hidden sm:block">
        <kbd className={cn("px-2 py-1 bg-muted rounded text-xs font-medium")}>
          cmd K
        </kbd>
      </div>
    </div>
  );
};
