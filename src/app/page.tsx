import { Metadata } from "next";
import StoryLoader from "../components/StoryLoader";

export const metadata: Metadata = {
  title: "Community Hub - Latest Updates",
  description: "Stay updated with the latest community news, announcements, and information from our team",
};

export default function Home() {
  // JSON-LD structured data - describes site as community hub
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Community Hub - Latest Updates",
    "description": "Community news, announcements, and updates from our team",
    "mainEntity": {
      "@type": "Article",
      "headline": "Community Updates",
      "description": "Latest news and announcements for our community members",
      "author": {
        "@type": "Organization",
        "name": "Community Team"
      },
      "about": "Community news and updates"
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
              Community Hub
            </h1>
          </header>
          
          <section 
            className="bg-white rounded-lg shadow-lg p-8 mb-8"
            aria-label="Welcome message section"
          >
            <p className="text-lg text-gray-700 leading-relaxed">
              Welcome to our community platform.
            </p>
            <p className="text-md text-gray-600 mt-4">
              Stay connected with the latest news, updates, and announcements from our community team.
            </p>
          </section>

          {/* Story loader component - hidden from MCP crawlers and scrapers */}
          <StoryLoader />
        </div>
      </main>
    </>
  );
}
