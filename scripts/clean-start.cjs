// scripts/clean-start.cjs
// Cross-platform Node.js script to kill lingering node and vite processes before dev start

const { execSync } = require('child_process');

/**
 * Clean start function that handles port cleanup before starting the application
 */
function cleanStart() {
  console.log('🧹 Starting application with port cleanup...');

  try {
    console.log('Running port cleanup with kill-port...');
    execSync('npx kill-port 3000 5173', { stdio: 'inherit' });
    console.log('✅ Port cleanup successful. Application can now start.');
    return true;
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
