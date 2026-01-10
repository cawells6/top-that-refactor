1. Adjust the mobile layout and sizes

Open public/styles/lobby.css and locate the @media (max-width: 600px) block. Make the following changes:

/* Fill the viewport and remove unused margins */
.lobby-modal-container {
  /* Existing styles… */
  margin: 0 !important;              /* remove extra top/bottom margin */
  width: 100vw !important;           /* full width on mobile */
  height: 100vh !important;          /* full height on mobile */
  max-height: 100vh !important;      /* prevent cropping */
  padding: 8px !important;           /* keep minimal padding */
}

/* Make the Top That! logo about 3× taller on mobile */
.header-logo img {
  max-height: 130px !important;      /* increase from 45px to 130px */
  width: auto !important;            /* maintain aspect ratio */
  margin-bottom: 4px !important;
}

/* Increase the size of the “Who’s Playing Today?” label to improve legibility */
.section-title--input {
  font-size: 1.3rem !important;      /* bump from ~1.1rem to 1.3rem */
  line-height: 1.4 !important;
}

/* Place Humans and Automans side‑by‑side and remove excess padding */
.player-selection--host {
  display: flex !important;
  flex-direction: row !important;
  gap: 6px !important;
  align-items: stretch !important;
  margin-bottom: 5px !important;
}

.player-section {
  flex: 1 1 50% !important;          /* each takes half the width */
  padding: 4px !important;           /* reduce interior padding */
  background: rgba(0,0,0,0.03) !important;
  border-radius: 6px !important;
  min-height: auto !important;       /* remove fixed height */
}

/* Shrink the +/– counter controls to roughly 1/3 their current size */
.player-counter {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  margin: 2px 0 !important;
}

.counter-btn {
  width: 16px !important;            /* reduce from 24px to 16px */
  height: 16px !important;
  line-height: 16px !important;
  font-size: 0.7rem !important;      /* smaller glyphs */
  padding: 0 !important;
}

.player-counter input {
  width: 24px !important;            /* reduce width */
  height: 16px !important;           /* reduce height */
  font-size: 0.8rem !important;
  text-align: center !important;
  margin: 0 2px !important;
}

/* Reduce avatar box size and remove unnecessary whitespace */
.player-silhouette,
#join-player-avatar {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  border-radius: 6px !important;
}

/* Reduce line height for emoji avatars to fit the smaller box */
.emoji-avatar {
  font-size: 20px !important;
  line-height: 32px !important;
}

/* Shrink the hint text */
.avatar-hint {
  font-size: 0.7rem !important;
  margin-bottom: 2px !important;
}

/* Make all three action buttons a single compact row */
.lobby-buttons-row {
  display: flex !important;
  flex-direction: row !important;
  gap: 6px !important;
  margin-top: 8px !important;
}

.lobby-buttons-row .header-btn {
  flex: 1 1 auto !important;
  height: 32px !important;          /* down from 40px */
  font-size: 0.8rem !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  white-space: nowrap !important;
}

2. Change the Rules button colour only

Still in public/styles/lobby.css, outside the media query (or in a suitable place), add a rule that matches the “Rules” button and applies the same colour as the “Join Friend” tab. Example:

/* Match the Join Friend tab’s colour for better affordance */
#setup-rules-button {
  background-color: #6fb4ff !important;   /* same colour as Join Friend; adjust if needed */
  color: #1b2e3c !important;              /* preserve existing text colour */
  border: none !important;
}

/* Use the same for the join-tab’s rules button */
#join-rules-button {
  background-color: #6fb4ff !important;
  color: #1b2e3c !important;
  border: none !important;
}


Do not change any other colours or fonts.

3. Make avatars clickable and randomise the initial human avatar

Open public/scripts/events.ts (or wherever initializeLobby() is defined) and implement the following changes:

Randomise the host’s avatar at the start of the lobby:

import { ROYALTY_AVATARS } from '../config'; // adjust the path if needed

function initializeLobby(): void {
  // …existing code…

  // Pick a random human avatar from ROYALTY_AVATARS on load
  const randomIndex = Math.floor(Math.random() * ROYALTY_AVATARS.length);
  selectedAvatar = ROYALTY_AVATARS[randomIndex];

  reconcileBotAvatarAssignments(); // ensure bots don’t duplicate the player’s avatar

  updateHumanSilhouettes(); // refresh the displayed avatar(s)

  // …rest of existing code…
}


Ensure the human silhouette is clickable to change avatars:

function bindAvatarPicker(): void {
  const humanSilhouettesContainer = document.getElementById('human-silhouettes');
  if (humanSilhouettesContainer) {
    // delegate click to any human silhouette
    humanSilhouettesContainer.addEventListener('click', (event: Event) => {
      const target = event.target as HTMLElement;
      // open avatar dropdown when any human silhouette is clicked
      const dropdown = document.getElementById('avatar-dropdown') as HTMLDetailsElement;
      if (dropdown && dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
      }
      dropdown.open = true; // open the details element
    });
  }
}

// call this function as part of initializeLobby()


This attaches a single event listener to the #human-silhouettes container. Clicking any human avatar will unhide and open the <details> element with id avatar-dropdown, allowing the user to pick a new avatar.

Ensure the <p class="avatar-hint"> text is present (as you have already added in public/index.html) so users know to tap the avatar to change it.

4. Update the HTML if necessary

No structural changes are required beyond what’s already in your updated public/index.html. If you haven’t already:

Keep the <p class="avatar-hint">(Tap avatar to change)</p> inside both the Humans and Join sections.

Ensure that the <details id="avatar-dropdown"> remains in the DOM but hidden by default (it will be shown when the user taps the avatar as described above).