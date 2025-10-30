import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const hookContent = `#!/bin/sh

# Git hook that runs after checkout (branch switch)
# This ensures firebase-messaging-sw.js is regenerated with correct env vars

# Get the previous and current branch info
prev_head=$1
new_head=$2
branch_switch=$3

# Only run on branch switches (not file checkouts)
if [ "$branch_switch" = "1" ]; then
  echo " Branch switched detected, regenerating service worker..."
  
  # Check if generate-sw script exists
  if [ -f "scripts/generate-sw.js" ]; then
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
      npm run generate-sw
    else
      echo "  node_modules not found. Run 'npm install' first."
    fi
  else
    echo "  generate-sw.js script not found."
  fi
fi
`;

// Create .git/hooks directory if it doesn't exist
const hooksDir = path.join(__dirname, '..', '.git', 'hooks');
if (!fs.existsSync(hooksDir)) {
  fs.mkdirSync(hooksDir, { recursive: true });
}

// Write the post-checkout hook
const hookPath = path.join(hooksDir, 'post-checkout');
fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });

console.log(' Git post-checkout hook installed successfully!');
console.log('   The service worker will now regenerate automatically when switching branches.');
