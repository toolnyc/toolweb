"use client";

import { motion } from "motion/react";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";

export function Hero() {
  const [mounted, setMounted] = useState(false);
  const [titleNumber, setTitleNumber] = useState(0);
  
  const titles = useMemo(
    () => ["amazing", "new", "wonderful", "beautiful", "smart"],
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
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
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
              <span className="text-cyan">This is something</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
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
            </h1>

            <p className="text-base md:text-lg leading-relaxed tracking-tight text-text-light max-w-2xl text-center">
              TOOL ® is a technical consultancy that provides your business the architecture, resources and systems
              to run sustainably.
            </p>
          </div>
          
          <div className="flex flex-row gap-3">
            <button className="px-6 py-3 rounded-xl font-semibold text-base border-2 border-black text-black hover:bg-black hover:text-white transition-all duration-300">
              Jump on a call 📞
            </button>
            <button className="px-6 py-3 rounded-xl font-semibold text-base bg-cyan text-black hover:bg-cyan/90 transition-all duration-300">
              Get started →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
