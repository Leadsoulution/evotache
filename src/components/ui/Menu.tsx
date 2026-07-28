"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { CheckIcon } from "@/components/ui/icons";

export interface MenuOption {
  value: string;
  label: string;
  dotColor?: string;
  icon?: ReactNode;
}

interface MenuPosition {
  top: number;
  left: number | null;
  right: number | null;
  width: number;
}

interface MenuProps {
  options: MenuOption[];
  value: string[];
  multiple?: boolean;
  onChange: (value: string[]) => void;
  ariaLabel: string;
  align?: "start" | "end";
  renderTrigger: (state: { open: boolean }) => ReactNode;
  className?: string;
}

export function Menu({ options, value, multiple = false, onChange, ariaLabel, align = "start", renderTrigger, className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0, right: null, width: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    // The panel is already mounted (via portal) by the time this runs, so its
    // real height is measurable — flip above the trigger when there isn't
    // enough room below, so menus near the bottom of the screen (e.g. the
    // sidebar's account menu) don't render off-screen.
    const panelHeight = panelRef.current?.offsetHeight ?? 0;
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldFlip = panelHeight > 0 && spaceBelow < panelHeight + 12 && rect.top > panelHeight + 12;
    const top = Math.max(4, shouldFlip ? rect.top - panelHeight - 6 : rect.bottom + 6);
    // Clamp the panel's left edge to stay within the viewport (with a small
    // margin) regardless of alignment — on narrow/mobile screens a trigger
    // near an edge would otherwise push the panel partly off-screen.
    const panelWidth = Math.max(rect.width, 180);
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - panelWidth - margin);
    const idealLeft = align === "end" ? rect.right - panelWidth : rect.left;
    const clampedLeft = Math.min(Math.max(idealLeft, margin), maxLeft);
    if (align === "end") {
      setPosition({ top, left: null, right: window.innerWidth - clampedLeft - panelWidth, width: rect.width });
    } else {
      setPosition({ top, left: clampedLeft, right: null, width: rect.width });
    }
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  const toggleOpen = useCallback(() => {
    setOpen((prevOpen) => {
      const nextOpen = !prevOpen;
      if (nextOpen) {
        const initialIndex = options.findIndex((option) => option.value === value[0]);
        setActiveIndex(initialIndex === -1 ? 0 : initialIndex);
      }
      return nextOpen;
    });
  }, [options, value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const close = useCallback((focusTrigger: boolean) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const select = useCallback(
    (option: MenuOption) => {
      if (multiple) {
        const next = value.includes(option.value) ? value.filter((v) => v !== option.value) : [...value, option.value];
        onChange(next);
      } else {
        onChange([option.value]);
        close(true);
      }
    },
    [multiple, onChange, value, close]
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setActiveIndex((i) => Math.min(options.length - 1, i + 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setActiveIndex((i) => Math.max(0, i - 1));
          break;
        case "Home":
          event.preventDefault();
          setActiveIndex(0);
          break;
        case "End":
          event.preventDefault();
          setActiveIndex(options.length - 1);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          if (options[activeIndex]) select(options[activeIndex]);
          break;
        case "Escape":
          event.preventDefault();
          close(true);
          break;
        case "Tab":
          setOpen(false);
          break;
      }
    },
    [activeIndex, close, options, select]
  );

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggleOpen}
        className="inline-flex items-center rounded-lg border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900"
      >
        {renderTrigger({ open })}
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            id={listboxId}
            aria-label={ariaLabel}
            aria-multiselectable={multiple}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left ?? undefined,
              right: position.right ?? undefined,
              minWidth: Math.max(position.width, 180),
            }}
            className="z-[95] max-h-72 animate-scale-in overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          >
            {options.length === 0 && <div className="px-2.5 py-1.5 text-sm text-slate-400">No options</div>}
            {options.map((option, index) => {
              const selected = value.includes(option.value);
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(option)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-slate-700 dark:text-slate-200",
                    index === activeIndex && "bg-slate-100 dark:bg-slate-800"
                  )}
                >
                  {option.dotColor && <span className={cn("h-2 w-2 shrink-0 rounded-full", option.dotColor)} />}
                  {option.icon}
                  <span className="flex-1 truncate">{option.label}</span>
                  {selected && <CheckIcon className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
