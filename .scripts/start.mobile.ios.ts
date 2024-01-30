const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { spawn } = require('child_process');

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'EXPO_PROJECT_SLUG',
  'EXPO_PROJECT_NAME',
  'EXPO_PROJECT_OWNER',
  'EXPO_PROJECT_ID'
];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

// Read original app.json content
const appJsonPath = path.resolve(__dirname, '../apps/mobile/app.json');
const originalAppJsonContent = fs.readFileSync(appJsonPath, 'utf8');

// Create a temporary JSON object to hold modified app.json content
let tempAppJson = {};

// Parse app.json into tempAppJson, replacing placeholders during parsing
try {
  tempAppJson = JSON.parse(
    originalAppJsonContent
      .replace(/\$EXPO_PROJECT_SLUG/g, process.env.EXPO_PROJECT_SLUG)
      .replace(/\$EXPO_PROJECT_NAME/g, process.env.EXPO_PROJECT_NAME)
      .replace(/\$EXPO_PROJECT_OWNER/g, process.env.EXPO_PROJECT_OWNER)
      .replace(/\$EXPO_PROJECT_ID/g, process.env.EXPO_PROJECT_ID)
  );
} catch (error) {
  console.error('Error parsing app.json:', error);
  process.exit(1);
}

// Serialize tempAppJson back to JSON string
const updatedAppJsonContent = JSON.stringify(tempAppJson, null, 2); // Indent for readability

// Write updated content to app.json
fs.writeFileSync(appJsonPath, updatedAppJsonContent);

console.log('app.json placeholders replaced successfully!');

// Run expo start --ios
const expoStartProcess = spawn('yarn', ['expo', 'start', '--ios'], {
  cwd: process.cwd(),
  stdio: 'inherit'
});

expoStartProcess.on('close', (code) => {
  console.log(`expo start --ios exited with code ${code}`);

  // Restore original app.json content
  fs.writeFileSync(appJsonPath, originalAppJsonContent);
});
