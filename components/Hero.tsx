"use client";

import { motion } from "motion/react";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";

export function Hero() {
  const [mounted, setMounted] = useState(false);
  const [titleNumber, setTitleNumber] = useState(0);
  
  const titles = useMemo(
    () => ["brand strategy", "web development", "marketing", "brand identity", "automation", "art direction", "artifical intelligence"],
    []
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full">
      <div>
        <div className="flex gap-8 items-center justify-center flex-col mt-6">  
          <div className="flex flex-col gap-4 flex-1 h-[40vh] my-24 md:my-12">
            <h1 className="text-5xl tracking-tighter text-center font-regular">
              <span className="relative flex justify-center overflow-hidden pb-4 pt-1 whitespace-nowrap">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-semibold"
                    initial={{ opacity: 0, y: "-100" }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
              <span>is a tool.</span>

            </h1>

            <p className="text-base md:text-lg leading-relaxed tracking-tight text-text-light max-w-sm text-center py-6">
              TOOL ® is a technical & creative consultancy that provides your business the architecture, resources and systems
              to run sustainably.
            </p>
          
            <button
            onClick={() => {
              window.open("https://calendar.app.google/6SDnteNY8ymSgomu9", "_blank");
            }}  
            className="hover:scale-110 max-w-md mx-auto hover:bg-[var(--color-cyan)] hover:text- capitalize px-6 py-3 font-semibold text-base border-2 border-black transition-all duration-300 ">
              schedule a call
            </button>
            </div>

            
            {/* Client Marquee */}
            <div className="mt-16 w-full">
              <div className="text-center mb-6">
                <p className="text-sm text-text-light font-bold">Trusted by</p>
              </div>
              <div className="relative overflow-hidden">
                <motion.div 
                  className="flex whitespace-nowrap"
                  animate={{ x: ["-0%", "-50%"] }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                >
                  <div className="flex items-center space-x-32 text-md text-text-light min-w-max">
                    <span>The Bill and Melinda Gates Foundation</span>
                    <span>Feel Films</span>
                    <span>Here Productions</span>
                    <span>House of Ill Fame</span>
                    <span>The Lacrosse Lab</span>
                    <span>Nickelodeon</span>
                    <span>Gallery 1882</span>
                    <span>The Lost Explorer Mezcal</span>
                    <span>Here Productions</span>
                    <span>Don't Tell Anyone Podcast</span>
                    <span>Voice for Nature</span>
                    {/* Duplicate for seamless loop */}
                    <span>The Bill and Melinda Gates Foundation</span>
                    <span>Feel Films</span>
                    <span>Here Productions</span>
                    <span>House of Ill Fame</span>
                    <span>The Lacrosse Lab</span>
                    <span>Nickelodeon</span>
                    <span>Gallery 1882</span>
                    <span>The Lost Explorer Mezcal</span>
                    <span>Here Productions</span>
                    <span>Don't Tell Anyone Podcast</span>
                    <span>Voice for Nature</span>
                  </div>
                </motion.div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
