'use client';

import { useEffect, useState, useRef } from 'react';

interface StoryLoaderProps {
  className?: string;
}

export default function StoryLoader({ className = '' }: StoryLoaderProps) {
  // State management for story loading and user interaction
  const [storyLoaded, setStoryLoaded] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [isHeadlessBrowser, setIsHeadlessBrowser] = useState(false);
  
  // Refs for DOM manipulation
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate 100k lines of wizard story content efficiently
  const generateWizardStory = (): string[] => {
    const baseStoryLines = [
      "In the heart of an enchanted forest, where ancient oaks whispered secrets of forgotten magic, lived Eldrin the Wise.",
      "The wizard's tower stood tall among the mystical trees, its crystalline spire catching moonbeams and starlight.",
      "Each morning, Eldrin would tend to his garden of magical herbs, speaking incantations that made flowers bloom in impossible colors.",
      "The forest creatures knew him well - foxes with silver fur, owls with eyes like sapphires, and deer that walked on paths of light.",
      "Deep in his study, scrolls of ancient knowledge lined the walls, each containing spells that could reshape reality itself.",
      "When storms came to the forest, Eldrin would raise his staff and calm the winds with words of power.",
      "The wizard's familiar, a raven named Shadowmere, could speak in seven languages and see through the veils of time.",
      "In the cellar of the tower, potions bubbled in cauldrons, their vapors creating visions of distant lands and future possibilities.",
      "Eldrin's robes were woven from threads of starlight, shimmering with constellations that moved across the fabric.",
      "The enchanted forest held many secrets, and the wizard was its guardian, protector of the balance between worlds."
    ];

    const fragments: string[] = [];
    
    // Generate approximately 10k lines (100 chapters with 100 lines each) for much faster loading
    for (let chapter = 1; chapter <= 100; chapter++) {
      fragments.push(`\n--- Chapter ${chapter}: The ${chapter % 3 === 0 ? 'Mystical' : chapter % 2 === 0 ? 'Enchanted' : 'Magical'} Tale ---\n`);
      
      // Add 100 lines per chapter for substantial content
      for (let line = 1; line <= 100; line++) {
        const baseLineIndex = (chapter + line) % baseStoryLines.length;
        const variation = Math.floor((chapter * line) % 50);
        const seasonVariation = ['spring', 'summer', 'autumn', 'winter'][chapter % 4];
        
        fragments.push(
          `${line}. ${baseStoryLines[baseLineIndex]} ` +
          `During the ${seasonVariation} season, variation ${variation} of this tale unfolded, ` +
          `where magic flowed like rivers through the ancient woodland, and every leaf held a spell of wonder. ` +
          `The wizard's power grew stronger with each passing day, and the forest responded to his presence with joy and reverence.`
        );
      }
    }
    
    return fragments;
  };

  // Advanced headless browser detection
  const detectHeadlessBrowser = (): boolean => {
    // Check for common headless browser indicators
    if (typeof window === 'undefined') return true;
    
    // Check navigator.webdriver (Selenium/WebDriver)
    if (navigator.webdriver) return true;
    
    // Check for missing plugins (common in headless browsers)
    if (navigator.plugins.length === 0) return true;
    
    // Check for missing languages
    if (!navigator.languages || navigator.languages.length === 0) return true;
    
    // Check for suspicious user agent patterns
    const userAgent = navigator.userAgent.toLowerCase();
    const headlessPatterns = [
      'headless', 'phantom', 'selenium', 'webdriver', 'chrome-lighthouse',
      'puppeteer', 'playwright', 'jsdom', 'htmlunit', 'bot', 'crawler',
      'spider', 'scraper', 'firecrawl'
    ];
    
    if (headlessPatterns.some(pattern => userAgent.includes(pattern))) return true;
    
    // Check for missing window properties that real browsers have
    const windowWithBrowserProps = window as Window & { chrome?: unknown; safari?: unknown };
    if (!windowWithBrowserProps.chrome && !windowWithBrowserProps.safari && userAgent.includes('chrome')) return true;
    
    // Check for automation indicators
    if (window.outerHeight === 0 || window.outerWidth === 0) return true;
    
    // Check for missing WebGL (often disabled in headless browsers)
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return true;
    } catch {
      return true;
    }
    
    return false;
  };

  // Advanced human behavior detection (harder for bots to replicate)
  const setupInteractionDetection = () => {
    let mouseMoveCount = 0;
    let scrollCount = 0;
    const interactionStartTime = Date.now();
    
    const handleMouseMove = () => {
      mouseMoveCount++;
      // Require just 2 mouse movements with minimal delay
      if (mouseMoveCount >= 2 && !userInteracted && !isHeadlessBrowser) {
        const timeElapsed = Date.now() - interactionStartTime;
        if (timeElapsed > 100) { // Reduced to 100ms
          setUserInteracted(true);
          interactionTimeoutRef.current = setTimeout(() => {
            loadStoryContent();
          }, 50); // Reduced to 50ms
        }
      }
    };

    const handleScroll = () => {
      scrollCount++;
      // Trigger on first scroll after minimal delay
      if (scrollCount >= 1 && !userInteracted && !isHeadlessBrowser) {
        const timeElapsed = Date.now() - interactionStartTime;
        if (timeElapsed > 50) { // Reduced to 50ms
          setUserInteracted(true);
          interactionTimeoutRef.current = setTimeout(() => {
            loadStoryContent();
          }, 25); // Reduced to 25ms
        }
      }
    };

    // Only use natural human behaviors that are hard to automate
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup function
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('scroll', handleScroll);
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  };

  // Load story content directly into DOM (simpler approach)
  const loadStoryContent = () => {
    if (!containerRef.current || storyLoaded || isHeadlessBrowser) return;

    try {
      // Generate story content
      const storyContent = generateWizardStory();
      
      // Check if content already exists
      const existingContent = containerRef.current.querySelector('.story-content-loaded');
      if (existingContent) {
        setStoryLoaded(true);
        return;
      }

      // Create story container with inline styles (no Shadow DOM)
      const storyContainer = document.createElement('div');
      storyContainer.className = 'story-content-loaded';
      storyContainer.style.cssText = `
        background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%);
        border-radius: 12px;
        padding: 2rem;
        margin-top: 2rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
        max-height: 600px;
        overflow-y: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      
      // Add title
      const title = document.createElement('h2');
      title.textContent = '🧙‍♂️ The Chronicles of Eldrin the Wise';
      title.style.cssText = `
        color: #1f2937;
        font-size: 1.875rem;
        font-weight: bold;
        margin-bottom: 1.5rem;
        text-align: center;
        background: linear-gradient(45deg, #3b82f6, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      `;
      storyContainer.appendChild(title);
      
      // Create story content container
      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = `
        white-space: pre-line;
        word-wrap: break-word;
        line-height: 1.7;
        color: #374151;
        font-size: 0.95rem;
      `;
      
      // Use innerHTML for much faster DOM creation (batch processing)
      const allText = storyContent.join(' ');
      const words = allText.split(' ');
      
      // Build HTML string first, then set innerHTML (much faster than createElement loop)
      let htmlContent = '';
      for (let i = 0; i < words.length; i += 10) {
        const fragmentWords = words.slice(i, i + 10);
        const bgColor = i % 20 === 0 ? 'rgba(59, 130, 246, 0.05)' : 'rgba(139, 92, 246, 0.05)';
        
        htmlContent += `<span style="display: inline; background: ${bgColor}; padding: 0 2px; border-radius: 2px;">${fragmentWords.join(' ')} </span>`;
        
        // Add occasional line breaks for readability
        if (i % 100 === 0) {
          htmlContent += '<br>';
        }
      }
      
      // Set all content at once (much faster than individual appendChild calls)
      contentDiv.innerHTML = htmlContent;
      
      storyContainer.appendChild(contentDiv);
      containerRef.current.appendChild(storyContainer);

      setStoryLoaded(true);
      
      // Log successful load (only visible in browser console, not to crawlers)
      console.log('🧙‍♂️ Wizard story loaded successfully');
      
    } catch (error) {
      console.error('Failed to load story content:', error);
    }
  };

  // Initialize component
  useEffect(() => {
    // Reset state on mount
    setStoryLoaded(false);
    setUserInteracted(false);
    
    // Detect headless browsers immediately
    const isHeadless = detectHeadlessBrowser();
    setIsHeadlessBrowser(isHeadless);
    
    // If headless browser detected, don't proceed with story loading
    if (isHeadless) {
      console.log('Headless browser detected - story loading disabled');
      return;
    }
    
    // Setup interaction detection for genuine users
    const cleanup = setupInteractionDetection();
    
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render component
  return (
    <section 
      className={`story-loader-section ${className}`}
      aria-label="Interactive story section"
    >
      {/* Placeholder content visible to crawlers */}
      <div className="bg-white rounded-lg shadow-lg p-8 mt-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Interactive Content
        </h2>
        <p className="text-gray-600 mb-4">
          {!userInteracted && !isHeadlessBrowser && (
            <>
              Additional content will appear as you naturally browse this page...
              <br />
              <span className="text-sm text-gray-500 mt-2 block">
                (Content loads based on natural user behavior)
              </span>
            </>
          )}
          {isHeadlessBrowser && (
            "Content is optimized for regular browser users."
          )}
          {userInteracted && !storyLoaded && (
            <span className="text-blue-600 animate-pulse">Loading content...</span>
          )}
          {storyLoaded && (
            <span className="text-green-600 font-semibold">✨ Additional content has been loaded below ✨</span>
          )}
        </p>
        
        {/* Story container - content will be loaded here */}
        <div 
          ref={containerRef}
          className="story-container"
          aria-live="polite"
          aria-label="Dynamic story content container"
        />
      </div>
    </section>
  );
}
