
import asyncio
from playwright.async_api import async_playwright, expect

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        url = "http://localhost:5173"

        print(f"Navigating to {url}")

        # Enable console logs
        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))

        await page.goto(url)

        # Wait for loading to finish
        print("Waiting for lobby...")
        try:
            # Just wait for the container to be visible
            await page.wait_for_selector('#lobby-container', state='visible', timeout=10000)
        except Exception as e:
            print("Lobby timeout. Taking screenshot...")
            await page.screenshot(path='verification_fail.png')
            raise e

        # 2. Join Game
        print("Entering name...")
        # Use simple selector for input
        await page.fill('input#player-name-input', 'Tester')

        print("Starting game...")
        await page.click('#setup-deal-button')

        # 3. Wait for game board
        print("Waiting for game table...")
        # Just wait for table visibility
        await page.wait_for_selector('#game-table', state='visible', timeout=10000)

        # Wait for hand to be rendered
        print("Waiting for hand cards...")
        await page.wait_for_selector('.hand-row--local .card-container', state='visible')

        # 4. Hover verification
        card = page.locator('.hand-row--local .card-container').first

        # Initial check
        print("Checking initial state...")
        initial_style = await card.evaluate("el => window.getComputedStyle(el).transform")
        print(f"Initial transform: {initial_style}")

        # Hover
        print("Hovering card...")
        await card.hover()

        # Wait a bit for transition
        await page.wait_for_timeout(500)

        # Check computed styles
        styles = await card.evaluate("""el => {
            const style = window.getComputedStyle(el);
            return {
                transform: style.transform,
                zIndex: style.zIndex,
                marginRight: style.marginRight
            }
        }""")

        print(f"Hover Styles: {styles}")

        # Take screenshot
        await page.screenshot(path='verification.png')
        print("Screenshot saved to verification.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
