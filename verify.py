from playwright.sync_api import sync_playwright

def verify_chat_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        page.goto("http://localhost:3000/")

        # Sety API key to bypass modal overlay, then reload
        page.evaluate("localStorage.setItem('davgpt_groq_key', 'test_key')")
        page.reload()

        # Take a screenshot of the main chat page interface to verify aria-labels
        # Note: aria-labels and titles are in the DOM, visual changes are not expected,
        # but we can verify the elements exist.
        page.wait_for_selector('.chat-page')
        page.screenshot(path="chat_ui_aria_labels.png")

        browser.close()

if __name__ == "__main__":
    verify_chat_ui()
