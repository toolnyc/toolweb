"use client";

import { motion } from "motion/react";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";

export function Hero() {
  const [mounted, setMounted] = useState(false);
  const [titleNumber, setTitleNumber] = useState(0);
  
  const titles = useMemo(
    () => ["brand strategy", "web development", "brand identity", "automation", "art direction"],
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
      <div className="container mx-auto">
        <div className="flex gap-8 -2 items-center justify-center flex-col">
          <div className="mb-8 flex justify-center">
            <Image
              src="/logo.svg"
              alt="Company Logo"
              width={160}
              height={160}
              className="w-32 h-32 sm:w-40 sm:h-40"
            />
          </div>
          
          <div className="flex gap-4 flex-col">
            <h1 className="text-3xl md:text-5xl max-w-2xl tracking-tighter text-center font-regular">
              <span className="relative flex justify-center overflow-hidden text-center md:pb-4 md:pt-1">
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
              <span className="text-cyan">is a tool</span>

            </h1>

            <p className="text-base md:text-lg leading-relaxed tracking-tight text-text-light max-w-2xl text-center">
              TOOL ® is a technical consultancy that provides your business the architecture, resources and systems
              to run sustainably.
            </p>
          </div>
          
            <button className="px-6 py-3 rounded-xl font-semibold text-base border-2 border-black text-black hover:bg-black hover:text-white transition-all duration-300 ">
              schedule a call  📞
            </button>
            
            {/* Client Marquee */}
            <div className="mt-16 w-full">
              <div className="text-center mb-6">
                <p className="text-sm text-text-light font-medium">Trusted by</p>
              </div>
              <div className="relative overflow-hidden">
                <motion.div 
                  className="flex whitespace-nowrap"
                  animate={{ x: ["-0%", "-50%"] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <div className="flex items-center space-x-16 text-sm text-text-light min-w-max">
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
