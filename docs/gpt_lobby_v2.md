1. Make the logo 15 % larger and tighten its vertical spacing

In public/styles/lobby.css, inside the mobile media query, update the logo rule and add tighter margin:

@media (max-width: 600px) {
  /* …existing mobile overrides… */

  /* Make the Top That! logo 15% larger (130px → ~150px) and reduce whitespace */
  .header-logo img {
    max-height: 150px !important;    /* increase from 130px to 150px */
    width: auto !important;
    margin-top: 6px !important;      /* remove extra space above */
    margin-bottom: 2px !important;   /* and below */
  }

  /* …other mobile rules… */
}


This enlarges the logo by ~15 % without changing its aspect ratio and trims the top/bottom margins so the header section keeps the same overall height.

2. Sharpen and enlarge “Who’s Playing Today?”

Still in the mobile media query, adjust the section-title for the name prompt:

@media (max-width: 600px) {
  /* …existing overrides… */

  /* Increase the “Who’s Playing Today?” text to match the Players/Bots headings */
  .section-title--input {
    font-size: 1.6rem !important;    /* up from 1.3rem:contentReference[oaicite:0]{index=0} */
    line-height: 1.5 !important;
  }
}


This keeps the same font family but increases the size to roughly match the PLAYERS/BOTS headings.

3. Shrink the name input field

Add or modify a rule for the name input (it has id player-name-input):

@media (max-width: 600px) {
  /* Reduce height of the name input to about half */
  #player-name-input {
    height: 32px !important;         /* down from ~64px */
    padding: 4px 10px !important;
    font-size: 0.9rem !important;
  }
}

4. Space the player sections slightly lower

To push the Players/Bots section down, add a top margin on the container:

@media (max-width: 600px) {
  /* Increase space between tab buttons and player selection */
  .player-selection--host {
    margin-top: 12px !important;     /* adds a bit of vertical breathing room */
  }
}

5. Move “Tap avatar to change” below the avatar container

Edit public/index.html (both the Host and Join panels) so that the hint appears after the silhouettes instead of before. For the host panel, change this structure:

<!-- Before -->
<p class="avatar-hint">(Tap avatar to change)</p>
<div id="human-silhouettes" class="player-silhouettes"></div>

<!-- After -->
<div id="human-silhouettes" class="player-silhouettes"></div>
<p class="avatar-hint">(Tap avatar to change)</p>


Do the same for the join panel where the hint exists. This aligns the text below the avatar on both sides.

6. Narrow the Tutorial / Rules / Let’s Play buttons

Currently each button stretches to fill one third of the container, so the row feels very wide

. Introduce a maximum width and center it:

@media (max-width: 600px) {
  .lobby-buttons-row {
    max-width: 320px;                /* prevent the buttons from spanning the full width */
    margin-left: auto;
    margin-right: auto;
  }
  .lobby-buttons-row .header-btn {
    flex: 0 0 32%;                   /* each takes about a third of the row’s width */
    padding: 0 !important;
  }
}


This keeps the row compact and reduces the overall button width, while still ensuring each button is tap‑able.

7. Style the Report Bug / Feedback button consistently

Add a rule targeting the feedback button (it uses id lobby-feedback-btn) so it resembles the other buttons:

#lobby-feedback-btn {
  display: inline-block;
  margin-top: 12px;
  padding: 6px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 20px;
  border: 2px solid #ffc300;         /* use your brand colour for consistency */
  background: #fffdf5;               /* light background like other pill buttons */
  color: #1b2e3c;
  text-align: center;
  cursor: pointer;
}


You can tweak the border and background colours to perfectly match your existing button styles (for example, reuse the gradient you apply to the Host Game button).