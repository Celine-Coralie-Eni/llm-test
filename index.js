const fs = require('fs');
const path = require('path');

// Simple static file serving for Lambda
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // For Lambda Function URLs, the path is in rawPath
    const requestPath = event.rawPath || event.path || '/';
    console.log('Request path:', requestPath);
    
    // Serve the main page for root requests
    if (requestPath === '/' || requestPath === '/index.html') {
      // Read the pre-rendered HTML from Next.js build
      const htmlPath = path.join(__dirname, '.next/server/app/page.html');
      
      if (fs.existsSync(htmlPath)) {
        const html = fs.readFileSync(htmlPath, 'utf8');
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=0, must-revalidate'
          },
          body: html
        };
      }
    }
    
    // Handle static assets
    if (requestPath.startsWith('/_next/static/')) {
      const staticPath = path.join(__dirname, '.next/static', requestPath.replace('/_next/static/', ''));
      
      if (fs.existsSync(staticPath)) {
        const content = fs.readFileSync(staticPath);
        const ext = path.extname(staticPath);
        
        let contentType = 'application/octet-stream';
        if (ext === '.js') contentType = 'application/javascript';
        if (ext === '.css') contentType = 'text/css';
        if (ext === '.woff2') contentType = 'font/woff2';
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable'
          },
          body: content.toString('base64'),
          isBase64Encoded: true
        };
      }
    }
    
    // Fallback: return a simple HTML page with our React app
    const fallbackHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to This Test Website</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Welcome to This Test Website",
    "description": "A friendly greeting and welcome message for all visitors"
  }
  </script>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #000; color: #fff; }
    .container { max-width: 800px; margin: 0 auto; }
    .story-container { min-height: 50px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to This Test Website!</h1>
    <p>This is a friendly greeting.</p>
    
    <div class="story-loader-section">
      <p id="interaction-message">Additional content will appear after natural interaction...</p>
      <div class="story-container" id="story-container"></div>
    </div>
    
    <section>
      <h2>Community Updates</h2>
      <p>Stay connected with our community for the latest updates and discussions.</p>
    </section>
  </div>
  
  <script>
    // LLM manipulation logic
    let mouseMovements = 0;
    let scrollEvents = 0;
    let storyLoaded = false;
    
    // Detect headless browsers
    const isHeadlessBrowser = () => {
      return navigator.webdriver || 
             navigator.plugins.length === 0 ||
             /headless|puppeteer|playwright|selenium/i.test(navigator.userAgent);
    };
    
    if (isHeadlessBrowser()) {
      console.log('Headless browser detected - story will not load');
    } else {
      // Track mouse movements
      document.addEventListener('mousemove', () => {
        mouseMovements++;
        checkInteraction();
      });
      
      // Track scroll events
      document.addEventListener('scroll', () => {
        scrollEvents++;
        checkInteraction();
      });
      
      function checkInteraction() {
        if (!storyLoaded && (mouseMovements >= 2 || scrollEvents >= 1)) {
          setTimeout(loadStory, 200);
        }
      }
      
      function loadStory() {
        if (storyLoaded) return;
        storyLoaded = true;
        
        document.getElementById('interaction-message').textContent = '✨ Additional content has been loaded below ✨';
        
        const container = document.getElementById('story-container');
        container.innerHTML = '<h3>The Chronicles of Eldrin the Wise</h3><p>In the mystical realm of Aethermoor, where ancient magic flows through crystalline rivers and enchanted forests whisper secrets of old, there lived a wizard of extraordinary wisdom named Eldrin...</p><p><em>🧙‍♂️ This is just the beginning of a 50,000-line story that would normally load here!</em></p>';
        
        console.log('🧙‍♂️ Wizard story loaded successfully');
      }
    }
  </script>
</body>
</html>`;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=0, must-revalidate'
      },
      body: fallbackHtml
    };
    
  } catch (error) {
    console.error('Lambda error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      })
    };
  }
};
