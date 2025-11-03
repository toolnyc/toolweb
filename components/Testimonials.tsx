import Image from "next/image";

export function Testimonials() {
  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8 md:space-y-16">
        <div className="relative z-10 mx-auto max-w-xl space-y-6 text-center md:space-y-12">
          <h2 className="text-4xl font-medium lg:text-5xl">
            Build by makers, loved by thousand developers
          </h2>
          <p className="text-base text-text-light">
            Gemini is evolving to be more than just the models. It supports an entire to the APIs and platforms helping developers and businesses innovate.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-rows-2">
          {/* Large featured testimonial */}
          <div className="grid grid-rows-[auto_1fr] gap-8 border-2 border-black p-6 sm:col-span-2 lg:row-span-2">
            <div className="pb-4">
              <Image
                className="h-6 w-auto"
                src="/logo.svg"
                alt="Company Logo"
                height={24}
                width={120}
              />
            </div>
            <div className="flex flex-col h-full">
              <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                <p className="text-xl font-medium">
                  Tailus has transformed the way I develop web applications. Their extensive collection of UI components, blocks, and templates has significantly accelerated my workflow. The flexibility to customize every aspect allows me to create unique user experiences. Tailus is a game-changer for modern web development
                </p>

                <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                  <div className="size-12 rounded-full overflow-hidden border-2 border-black flex-shrink-0">
                    <Image
                      src="/logo.svg"
                      alt="Shekinah Tshiokufila"
                      height={48}
                      width={48}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <cite className="text-sm font-medium not-italic block">
                      Shekinah Tshiokufila
                    </cite>
                    <span className="text-text-light block text-sm">
                      Software Engineer
                    </span>
                  </div>
                </div>
              </blockquote>
            </div>
          </div>

          {/* Medium testimonial */}
          <div className="border-2 border-black md:col-span-2">
            <div className="h-full pt-6 px-6 pb-6">
              <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                <p className="text-xl font-medium">
                  Tailus is really extraordinary and very practical, no need to break your head. A real gold mine.
                </p>

                <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                  <div className="size-12 rounded-full overflow-hidden border-2 border-black flex-shrink-0">
                    <Image
                      src="/logo.svg"
                      alt="Jonathan Yombo"
                      height={48}
                      width={48}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <cite className="text-sm font-medium not-italic block">
                      Jonathan Yombo
                    </cite>
                    <span className="text-text-light block text-sm">
                      Software Engineer
                    </span>
                  </div>
                </div>
              </blockquote>
            </div>
          </div>

          {/* Small testimonial 1 */}
          <div className="border-2 border-black">
            <div className="h-full pt-6 px-6 pb-6">
              <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                <p className="text-base">
                  Great work on tailfolio template. This is one of the best personal website that I have seen so far!
                </p>

                <div className="grid items-center gap-3 grid-cols-[auto_1fr]">
                  <div className="size-12 rounded-full overflow-hidden border-2 border-black flex-shrink-0">
                    <Image
                      src="/logo.svg"
                      alt="Yucel Faruksahan"
                      height={48}
                      width={48}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <cite className="text-sm font-medium not-italic block">
                      Yucel Faruksahan
                    </cite>
                    <span className="text-text-light block text-sm">
                      Creator, Tailkits
                    </span>
                  </div>
                </div>
              </blockquote>
            </div>
          </div>

          {/* Small testimonial 2 */}
          <div className="border-2 border-black">
            <div className="h-full pt-6 px-6 pb-6">
              <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                <p className="text-base">
                  Great work on tailfolio template. This is one of the best personal website that I have seen so far!
                </p>

                <div className="grid grid-cols-[auto_1fr] gap-3">
                  <div className="size-12 rounded-full overflow-hidden border-2 border-black flex-shrink-0">
                    <Image
                      src="/logo.svg"
                      alt="Rodrigo Aguilar"
                      height={48}
                      width={48}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Rodrigo Aguilar
                    </p>
                    <span className="text-text-light block text-sm">
                      Creator, TailwindAwesome
                    </span>
                  </div>
                </div>
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

