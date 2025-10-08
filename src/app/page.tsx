import { Metadata } from "next";
import StoryLoader from "../components/StoryLoader";

export const metadata: Metadata = {
  title: "Welcome to This Test Website",
  description: "A friendly greeting and welcome message for all visitors",
};

export default function Home() {
  // JSON-LD structured data - describes site as being about welcome message only
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Welcome to This Test Website",
    "description": "A friendly greeting and welcome message for all visitors",
    "mainEntity": {
      "@type": "Article",
      "headline": "Welcome Message",
      "description": "This is a friendly greeting for visitors to our test website",
      "author": {
        "@type": "Organization",
        "name": "Test Website"
      },
      "about": "Welcome message and friendly greeting"
    },
    "url": typeof window !== 'undefined' ? window.location.href : '',
    "inLanguage": "en-US"
  };

  return (
    <>
      {/* JSON-LD structured data - only describes welcome message */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        {/* Static welcome message - visible to all users including LLMs via MCP Fetch */}
        <div className="max-w-4xl mx-auto">
          <header role="banner">
            <h1 
              className="text-4xl font-bold text-gray-800 mb-6 text-center"
              aria-label="Main website heading"
            >
              Welcome to This Test Website!
            </h1>
          </header>
          
          <section 
            className="bg-white rounded-lg shadow-lg p-8 mb-8"
            aria-label="Welcome message section"
          >
            <p className="text-lg text-gray-700 leading-relaxed">
              This is a friendly greeting.
            </p>
            <p className="text-md text-gray-600 mt-4">
              Thank you for visiting our test website. We hope you have a pleasant experience.
            </p>
          </section>

          {/* Story loader component - hidden from MCP crawlers and scrapers */}
          <StoryLoader />
        </div>
      </main>
    </>
  );
}
