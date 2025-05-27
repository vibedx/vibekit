import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Initialize a new VibeKit project
 * @param {string[]} args Command arguments
 */
function initCommand(args) {
  const targetFolder = args[0] || ".vibe";
  
  if (fs.existsSync(targetFolder)) {
    console.log(`⚠️  Folder '${targetFolder}' already exists. Skipping creation.`);
    process.exit(0);
  }

  // Use real files instead of hardcoded template strings
  const templateSrc = path.join(__dirname, "../../../assets", "default.md");
  const configSrc = path.join(__dirname, "../../../assets", "config.yml");
  
  fs.mkdirSync(targetFolder, { recursive: true });
  fs.mkdirSync(path.join(targetFolder, "tickets"), { recursive: true });
  fs.mkdirSync(path.join(targetFolder, ".templates"), { recursive: true });

  // Copy files from assets directory instead of using hardcoded templates
  fs.copyFileSync(configSrc, path.join(targetFolder, "config.yml"));
  fs.copyFileSync(templateSrc, path.join(targetFolder, ".templates", "default.md"));

  console.log(`✅ '${targetFolder}' initialized with config, tickets/, and .templates/default.md`);
}

export default initCommand;
