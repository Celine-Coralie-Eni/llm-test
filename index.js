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
      // Try to read the pre-rendered HTML from Next.js build
      const possiblePaths = [
        path.join(__dirname, '.next/server/app/index.html'),
        path.join(__dirname, '.next/server/app/page.html'),
        path.join(__dirname, '.next/server/pages/index.html')
      ];
      
      console.log('Looking for HTML files in:', possiblePaths);
      
      for (const htmlPath of possiblePaths) {
        console.log('Checking path:', htmlPath, 'exists:', fs.existsSync(htmlPath));
        if (fs.existsSync(htmlPath)) {
          let html = fs.readFileSync(htmlPath, 'utf8');
          console.log('Found HTML file, length:', html.length);
          
          // The CSS is already included in the Next.js build, no need to inject
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
      
      console.log('No HTML files found, using fallback');
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
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      margin: 0; 
      padding: 20px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff; 
      min-height: 100vh;
      line-height: 1.6;
    }
    .container { 
      max-width: 800px; 
      margin: 0 auto; 
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    h1 { 
      font-size: 2.5rem; 
      margin-bottom: 1rem; 
      text-align: center;
      background: linear-gradient(45deg, #fff, #f0f0f0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    h2 { 
      color: #f0f0f0; 
      border-bottom: 2px solid rgba(255, 255, 255, 0.3);
      padding-bottom: 10px;
    }
    p { 
      font-size: 1.1rem; 
      margin-bottom: 1rem; 
      color: #f5f5f5;
    }
    .story-container { 
      min-height: 50px; 
      margin-top: 20px; 
      padding: 20px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .story-loader-section {
      margin: 30px 0;
    }
    #interaction-message {
      font-style: italic;
      color: #e0e0e0;
      text-align: center;
    }
    section {
      margin-top: 40px;
    }
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
