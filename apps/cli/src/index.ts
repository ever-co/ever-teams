#!/usr/bin/env node
import { processIo } from './io.js';
import { run } from './run.js';

process.exitCode = await run(processIo());
