import { type FullConfig } from '@playwright/test';
import http from 'http';

function httpRequest(url: string, options: { method?: string } = {}): Promise<{ status: number; ok: boolean }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: options.method || 'GET',
        timeout: 5000
      },
      (res) => {
        resolve({ status: res.statusCode || 0, ok: res.statusCode ? res.statusCode >= 200 && res.statusCode < 300 : false });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function globalSetup(config: FullConfig) {
  const backendUrl = 'http://localhost:5050';
  const maxAttempts = 30;
  const delay = 1000;

  console.log('Waiting for backend to be ready...');
  // Wait for backend to be ready
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await httpRequest(`${backendUrl}/api/health`);
      if (result.ok) {
        console.log('✓ Backend is ready');
        break;
      }
    } catch (error) {
      if (i === maxAttempts - 1) {
        throw new Error(`Backend did not become ready after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Verify test utils are enabled
  console.log('Verifying test utils are enabled...');
  try {
    const result = await httpRequest(`${backendUrl}/api/test-utils/reset`, {
      method: 'POST'
    });
    if (!result.ok) {
      if (result.status === 404) {
        throw new Error(
          `Test utils endpoint not found (404). Make sure ENABLE_TEST_UTILS=true is set in the environment when running 'npm run dev'.`
        );
      }
      throw new Error(
        `Test utils endpoint returned ${result.status}. Make sure ENABLE_TEST_UTILS=true is set.`
      );
    }
    console.log('✓ Test utils are enabled');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        throw new Error(
          `Failed to reach test utils endpoint. Make sure the backend is running and ENABLE_TEST_UTILS=true is set in the environment.`
        );
      }
      throw error;
    }
    throw new Error(`Unexpected error: ${String(error)}`);
  }
}

export default globalSetup;
