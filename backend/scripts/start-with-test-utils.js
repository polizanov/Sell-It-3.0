#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// Wrapper script to ensure ENABLE_TEST_UTILS is set before starting the server
// This must be set BEFORE dotenv/config loads
process.env.ENABLE_TEST_UTILS = 'true';

// Load dotenv/config AFTER setting the env var
require('dotenv/config');

// Now require the server
require('ts-node/register/transpile-only');
require('../src/server.ts');
