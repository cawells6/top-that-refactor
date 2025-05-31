// trigger-cards-update.js - Simple script to trigger card updates in the rules section

document.addEventListener('DOMContentLoaded', () => {
  console.log('🔄 Triggering card update events');
  
  // Dispatch event immediately to update cards
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent('update-rule-cards'));
  }, 300);
  
  // Set up event listeners for rule sections
  const ruleSections = document.querySelectorAll('.rules-summary');
  ruleSections.forEach(section => {
    section.addEventListener('click', () => {
      console.log('Rule section clicked, updating cards');
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('update-rule-cards'));
      }, 100);
    });
  });
  
  // Also listen for expand/collapse button clicks
  const expandBtn = document.getElementById('expand-collapse-all-btn');
  if (expandBtn) {
    expandBtn.addEventListener('click', () => {
      console.log('Expand/collapse button clicked, updating cards');
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('update-rule-cards'));
      }, 100);
    });
  }
});
