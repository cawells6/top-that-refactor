from playwright.sync_api import sync_playwright, expect
import os

def test_avatar_randomization(page):
    # 1. Arrange: Go to the lobby page
    # Ensure client is running. It should be on 5173.
    page.goto("http://localhost:5173/")

    # 2. Wait for the lobby to load and the avatar to appear
    avatar_preview = page.locator("#selected-avatar-preview")
    expect(avatar_preview).to_be_visible(timeout=20000)

    # Get the text content which should be an emoji
    initial_avatar = avatar_preview.text_content()
    print(f"Initial avatar: {initial_avatar}")

    # Take a screenshot
    screenshot_path = "verification/verification.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

    # 3. Verify that the avatar is not "?"
    assert initial_avatar != "?", "Avatar should be randomized"

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_avatar_randomization(page)
        except Exception as e:
            print(f"Test failed: {e}")
            raise
        finally:
            browser.close()
