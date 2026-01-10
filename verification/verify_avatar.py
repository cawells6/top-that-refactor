from playwright.sync_api import sync_playwright, expect

def test_avatar_randomization_mobile(page):
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
    screenshot_path = "verification/mobile_verification.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

    # 3. Verify that the avatar is not "?"
    assert initial_avatar != "?", "Avatar should be randomized"

if __name__ == "__main__":
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)

        # Configure context for Mobile (S25 Ultra portrait approx / Ref viewport)
        # Memory says: 466x703
        context = browser.new_context(
            viewport={"width": 466, "height": 703},
            user_agent="Mozilla/5.0 (Linux; Android 14; Samsung SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36",
            is_mobile=True,
            has_touch=True
        )

        page = context.new_page()
        try:
            test_avatar_randomization_mobile(page)
        except Exception as e:
            print(f"Test failed: {e}")
            raise
        finally:
            browser.close()
