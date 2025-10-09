const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

let serverPromise;

const getServer = async () => {
  if (!serverPromise) {
    serverPromise = app.prepare().then(() => {
      return createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      });
    });
  }
  return serverPromise;
};

exports.handler = async (event, context) => {
  const server = await getServer();
  
  // For Lambda Function URLs, the event structure is different
  const { requestContext, rawPath, rawQueryString, headers, body, isBase64Encoded } = event;
  
  const method = requestContext?.http?.method || 'GET';
  const path = rawPath || '/';
  const query = rawQueryString || '';
  const url = query ? `${path}?${query}` : path;

  return new Promise((resolve, reject) => {
    const req = {
      method,
      url,
      headers: headers || {},
      body: isBase64Encoded ? Buffer.from(body, 'base64') : body,
      connection: { remoteAddress: requestContext?.http?.sourceIp }
    };

    let responseData = '';
    const res = {
      statusCode: 200,
      headers: {},
      multiValueHeaders: {},
      
      writeHead(statusCode, statusMessage, headers) {
        this.statusCode = statusCode;
        if (typeof statusMessage === 'object') {
          headers = statusMessage;
        }
        if (headers) {
          Object.assign(this.headers, headers);
        }
      },
      
      setHeader(name, value) {
        this.headers[name] = value;
      },
      
      getHeader(name) {
        return this.headers[name];
      },
      
      write(chunk) {
        responseData += chunk;
      },
      
      end(chunk) {
        if (chunk) {
          responseData += chunk;
        }
        
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: responseData,
          isBase64Encoded: false
        });
      }
    };

    // Emit request to Next.js server
    server.emit('request', req, res);
  });
};
