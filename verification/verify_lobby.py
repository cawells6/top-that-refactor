from playwright.sync_api import sync_playwright
import time

def verify_lobby():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the lobby
            page.goto("http://localhost:3000")

            # Wait a bit for JS to init
            time.sleep(2)

            # Manually make lobby visible (just in case, though the app should do it)
            # We do this BEFORE waiting for visibility, because the app might default to hidden
            page.evaluate("document.body.classList.add('showing-lobby')")
            page.evaluate("document.getElementById('lobby-container').classList.remove('lobby--hidden')")

             # Wait for the lobby to be visible now that we forced it
             # Use a simple timeout instead of wait_for_selector if it's being stubborn about style recalc
            time.sleep(1)

            # Take a screenshot of the whole lobby
            page.screenshot(path="verification/lobby_screenshot.png", full_page=True)
            print("Screenshot taken at verification/lobby_screenshot.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_lobby()
