// scripts/clean-start.cjs
// Cross-platform Node.js script to kill lingering node and vite processes before dev start

const path = require('path');
const fs = require('fs');

/**
 * Clean start function that handles port cleanup before starting the application
 */
function cleanStart() {
  console.log('🧹 Starting application with port cleanup...');

  // Only run the cleanup once
  const cleanupPath = path.join(__dirname, 'port-cleanup.cjs');
  console.log(`Looking for port cleanup module at: ${cleanupPath}`);

  try {
    if (fs.existsSync(cleanupPath)) {
      console.log('Running port cleanup...');
      const { cleanupPorts } = require(cleanupPath);
      const success = cleanupPorts(true);
      
      if (success) {
        console.log('✅ Port cleanup successful. Application can now start.');
      } else {
        console.warn('⚠️ Some ports could not be freed. Application may not start correctly.');
      }
      
      return success;
    } else {
      console.error('❌ Port cleanup module not found.');
      return false;
    }
  } catch (error) {
    console.error('❌ Error during port cleanup:', error);
    console.log('Continuing application startup despite cleanup failure...');
    return false;
  }
}

// Run the cleanup when this script is executed directly
if (require.main === module) {
  const success = cleanStart();
  if (!success) {
    console.log('🚀 Continuing with application startup despite cleanup warnings...');
    // Don't exit with error to allow startup to continue
  }
}

module.exports = cleanStart;
