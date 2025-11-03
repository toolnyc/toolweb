export function Footer() {
  // TODO: Update these URLs with actual Instagram and email
  const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/tool.nyc";
  const emailAddress = process.env.NEXT_PUBLIC_EMAIL || "mailto:admin@tool.nyc";

  return (
    <footer className="w-full border-t border-black mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-16">
          <div className="flex items-center gap-6">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-light hover:text-black transition-colors duration-300"
            >
              Instagram
            </a>
            <a
              href={`mailto:${emailAddress}`}
              className="text-sm text-text-light hover:text-black transition-colors duration-300"
            >
              Email
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

