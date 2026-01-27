/**
 * Debug version of Port Cleanup utility
 */

/**
 * Simple test to check what ports are being reported
 */
async function checkPorts() {
  const portsToCheck = [3000, 5173]; // Only these two ports should be checked

  console.log('\n=== DEBUG PORT STATUS ===');
  console.log('portsToCheck array contains:', portsToCheck);

  try {
    // Loop through ports and display each one
    console.log('\nChecking each port:');
    portsToCheck.forEach((port, index) => {
      console.log(`[${index}] Port ${port}`);
    });

    // Check array length
    console.log(`\nArray length: ${portsToCheck.length}`);
    console.log(`Last index: ${portsToCheck.length - 1}`);

    // Validate no hidden ports
    for (let i = 0; i < 10; i++) {
      if (i < portsToCheck.length) {
        console.log(`At index ${i}: ${portsToCheck[i]}`);
      } else {
        console.log(`At index ${i}: undefined`);
      }
    }

    console.log('\n=== END DEBUG ===');
  } catch (error) {
    console.error('Error during debug:', error);
  }
}

// Run the debug check
checkPorts();
