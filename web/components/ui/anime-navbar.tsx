"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface NavBarProps {
  items: NavItem[];
  className?: string;
  defaultActive?: string;
}

export function AnimeNavBar({ items, className, defaultActive = "Home" }: NavBarProps) {
  const [mounted, setMounted] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(defaultActive);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => setMounted(true), []);

  // "Swallow" on scroll down, reveal on scroll up.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 120 && y > lastScrollY.current) setHidden(true);
      else setHidden(false);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: highlight the section currently in view.
  useEffect(() => {
    const hashItems = items.filter((i) => i.url.startsWith("#"));
    if (hashItems.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const match = hashItems.find((i) => i.url === `#${e.target.id}`);
            if (match) setActiveTab(match.name);
          }
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    hashItems.forEach((i) => {
      const el = document.getElementById(i.url.slice(1));
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [items]);

  function handleClick(e: React.MouseEvent, item: NavItem) {
    setActiveTab(item.name);
    if (item.url.startsWith("#")) {
      e.preventDefault();
      const el = document.querySelector(item.url);
      const lenis = (window as unknown as { __lenis?: { scrollTo: (t: Element, o?: object) => void } }).__lenis;
      if (el && lenis) lenis.scrollTo(el, { offset: -90 });
      else el?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (item.url === "/") {
      e.preventDefault();
      const lenis = (window as unknown as { __lenis?: { scrollTo: (t: number) => void } }).__lenis;
      if (lenis) lenis.scrollTo(0);
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // For real routes (e.g. "/dashboard") let the <Link> navigate natively.
  }

  if (!mounted) return null;

  return (
    <div className={cn("pointer-events-none fixed left-0 right-0 top-3 z-[9999] sm:top-5", className)}>
      <div className="flex justify-center px-3 pt-4 sm:pt-6">
        <motion.div
          className="pointer-events-auto relative flex items-center gap-1 rounded-full border border-white/10 bg-black/60 p-1.5 shadow-lg backdrop-blur-lg sm:gap-2 sm:p-2"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: hidden ? -120 : 0, opacity: hidden ? 0 : 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            const isHovered = hoveredTab === item.name;

            return (
              <Link
                key={item.name}
                href={item.url}
                onClick={(e) => handleClick(e, item)}
                onMouseEnter={() => setHoveredTab(item.name)}
                onMouseLeave={() => setHoveredTab(null)}
                className={cn(
                  "relative cursor-pointer rounded-full px-3.5 py-2 text-[12px] font-semibold transition-all duration-300 sm:px-5 sm:py-2.5 sm:text-[13px]",
                  "text-white/70 hover:text-white",
                  isActive && "text-white",
                )}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 -z-10 overflow-hidden rounded-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.03, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="absolute inset-0 rounded-full bg-primary/25 blur-md" />
                    <div className="absolute inset-[-4px] rounded-full bg-primary/20 blur-xl" />
                    <div className="absolute inset-[-8px] rounded-full bg-primary/15 blur-2xl" />
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0"
                      style={{ animation: "shine 3s ease-in-out infinite" }}
                    />
                  </motion.div>
                )}

                <span className="relative z-10 hidden md:inline">{item.name}</span>
                <motion.span className="relative z-10 md:hidden" whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                  <Icon size={18} strokeWidth={2.5} />
                </motion.span>

                <AnimatePresence>
                  {isHovered && !isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 -z-10 rounded-full bg-white/10"
                    />
                  )}
                </AnimatePresence>

                {isActive && (
                  <motion.div
                    layoutId="anime-mascot"
                    className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <div className="relative h-11 w-11">
                      <motion.div
                        className="absolute left-1/2 h-9 w-9 -translate-x-1/2 rounded-full bg-white"
                        animate={
                          hoveredTab
                            ? { scale: [1, 1.1, 1], rotate: [0, -5, 5, 0], transition: { duration: 0.5, ease: "easeInOut" } }
                            : { y: [0, -3, 0], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } }
                        }
                      >
                        <motion.div
                          className="absolute h-2 w-2 rounded-full bg-black"
                          animate={hoveredTab ? { scaleY: [1, 0.2, 1], transition: { duration: 0.2, times: [0, 0.5, 1] } } : {}}
                          style={{ left: "25%", top: "40%" }}
                        />
                        <motion.div
                          className="absolute h-2 w-2 rounded-full bg-black"
                          animate={hoveredTab ? { scaleY: [1, 0.2, 1], transition: { duration: 0.2, times: [0, 0.5, 1] } } : {}}
                          style={{ right: "25%", top: "40%" }}
                        />
                        <motion.div
                          className="absolute h-1.5 w-2 rounded-full bg-gold-soft"
                          animate={{ opacity: hoveredTab ? 0.8 : 0.6 }}
                          style={{ left: "15%", top: "55%" }}
                        />
                        <motion.div
                          className="absolute h-1.5 w-2 rounded-full bg-gold-soft"
                          animate={{ opacity: hoveredTab ? 0.8 : 0.6 }}
                          style={{ right: "15%", top: "55%" }}
                        />
                        <motion.div
                          className="absolute h-2 w-4 rounded-full border-b-2 border-black"
                          animate={hoveredTab ? { scaleY: 1.5, y: -1 } : { scaleY: 1, y: 0 }}
                          style={{ left: "30%", top: "60%" }}
                        />
                        <AnimatePresence>
                          {hoveredTab && (
                            <>
                              <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                className="absolute -right-1 -top-1 h-2 w-2 text-gold"
                              >
                                ✦
                              </motion.div>
                              <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                transition={{ delay: 0.1 }}
                                className="absolute -top-2 left-0 h-2 w-2 text-gold"
                              >
                                ✦
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </motion.div>
                      <motion.div
                        className="absolute -bottom-1 left-1/2 h-4 w-4 -translate-x-1/2"
                        animate={
                          hoveredTab
                            ? { y: [0, -4, 0], transition: { duration: 0.3, repeat: Infinity, repeatType: "reverse" } }
                            : { y: [0, 2, 0], transition: { duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.5 } }
                        }
                      >
                        <div className="h-full w-full origin-center rotate-45 transform bg-white" />
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </Link>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
