import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const templatePath = path.join(__dirname, '../apps/mobile/app.template.json');
const appJsonPath = path.join(__dirname, '../apps/mobile/app.json');

fs.copyFile(templatePath, appJsonPath, (err) => {
  if (err) {
    console.error('Error copying template file:', err);
    return;
  }

  fs.readFile(appJsonPath, 'utf8', (err, appData) => {
    if (err) {
      console.error('Error reading app.json file:', err);
      return;
    }

    const updatedData = appData
      .replace(/\$EXPO_PROJECT_SLUG/g, process.env.EXPO_PROJECT_SLUG)
      .replace(/\$EXPO_PROJECT_NAME/g, process.env.EXPO_PROJECT_NAME)
      .replace(/\$EXPO_PROJECT_OWNER/g, process.env.EXPO_PROJECT_OWNER)
      .replace(/\$EXPO_PROJECT_ID/g, process.env.EXPO_PROJECT_ID)
      .replace(/\$EXPO_PROJECT_PACKAGE_NAME/g, process.env.EXPO_PROJECT_PACKAGE_NAME)
      .replace(/\$EXPO_PROJECT_IOS_BUNDLE_IDENTIFIER/g, process.env.EXPO_PROJECT_IOS_BUNDLE_IDENTIFIER);

    fs.writeFile(appJsonPath, updatedData, (err) => {
      if (err) {
        console.error('Error writing app.json file:', err);
        return;
      }

      console.log('app.json generated successfully!');
    });
  });
});
