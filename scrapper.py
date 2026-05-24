import time
import os
import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# ---------- SETTINGS ----------
MAX_CHATS = 1000
SCROLL_DELAY = 1.5
SCROLL_ROUNDS = 30
# ------------------------------

# -------- BROWSER SETUP --------
options = Options()
options.add_argument("--start-maximized")
options.add_argument("--disable-notifications")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
driver.get("https://web.whatsapp.com")

input("👉 Scan QR and press ENTER when WhatsApp is fully loaded...")

wait = WebDriverWait(driver, 60)
short_wait = WebDriverWait(driver, 10)

# -------- WAIT FOR CHAT LIST --------
# Wait for any chat row to appear (proves WhatsApp is loaded)
wait.until(EC.presence_of_element_located((By.XPATH, '//div[@role="row"]')))
print("✅ WhatsApp Loaded")

os.makedirs("chats", exist_ok=True)


def get_chat_rows():
    """Re-fetch all chat row elements from the sidebar (avoids stale refs)."""
    return driver.find_elements(By.XPATH, '//div[@role="row"]')


def click_chat(chat_el):
    """Scroll a chat into view and click it. Returns True if conversation opened."""
    try:
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", chat_el)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", chat_el)
        time.sleep(2)

        # Check if a conversation panel appeared (the message input box is the proof)
        try:
            short_wait.until(
                EC.presence_of_element_located((By.XPATH, '//footer//div[@contenteditable="true"]'))
            )
            return True
        except:
            return False
    except:
        return False


def get_chat_name():
    """Extract the name/number of the currently open chat."""
    try:
        # The conversation header has a clickable span with the contact name
        # It's inside the main panel header (not the sidebar header)
        header = driver.find_element(By.XPATH, '//div[@id="main"]//header//span[@dir="auto"]')
        return header.text.strip()
    except:
        return ""


def get_contact_number():
    """Try to get the phone number by opening the contact info panel."""
    number = ""
    try:
        # Click the contact name in the header to open info
        header_clickable = driver.find_element(By.XPATH, '//div[@id="main"]//header')
        header_clickable.click()
        time.sleep(2)

        # Look for phone number
        elems = driver.find_elements(By.XPATH, '//span[contains(text(), "+")]')
        for el in elems:
            txt = el.text.strip()
            if txt.startswith("+") and any(c.isdigit() for c in txt):
                number = txt
                break

        # Close with Escape
        driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.ESCAPE)
        time.sleep(1)
    except:
        try:
            driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.ESCAPE)
            time.sleep(0.5)
        except:
            pass
    return number


def scroll_and_extract_messages():
    """Scroll up to load history, then extract all messages."""
    # Find the scrollable message container inside #main
    try:
        msg_container = driver.find_element(
            By.XPATH, '//div[@id="main"]//div[contains(@class,"copyable-area")]'
        )
    except:
        print("    ⚠️ Could not find message container")
        return []

    # Scroll up to load history
    last_height = -1
    for r in range(SCROLL_ROUNDS):
        driver.execute_script("arguments[0].scrollTop = 0", msg_container)
        time.sleep(SCROLL_DELAY)
        new_height = driver.execute_script("return arguments[0].scrollHeight", msg_container)
        if new_height == last_height:
            print(f"    ⬆️ History loaded ({r + 1} rounds)")
            break
        last_height = new_height

    # Scroll back to bottom so all messages are in DOM
    driver.execute_script(
        "arguments[0].scrollTop = arguments[0].scrollHeight", msg_container
    )
    time.sleep(1)

    # Extract messages — WhatsApp uses message-in / message-out classes
    messages = driver.find_elements(
        By.XPATH, '//div[@id="main"]//div[contains(@class,"message-in") or contains(@class,"message-out")]'
    )

    results = []
    for msg in messages:
        try:
            cls = msg.get_attribute("class") or ""
            sender = "You" if "message-out" in cls else "Other"

            # Text content
            text = ""
            try:
                text_span = msg.find_element(
                    By.XPATH, './/span[contains(@class,"selectable-text")]'
                )
                text = text_span.text.strip()
            except:
                # Try copyable-text as fallback
                try:
                    text_span = msg.find_element(
                        By.XPATH, './/span[contains(@class,"copyable-text")]'
                    )
                    text = text_span.text.strip()
                except:
                    pass

            if not text:
                continue

            # Timestamp
            timestamp = ""
            try:
                meta = msg.find_element(By.XPATH, './/div[@data-pre-plain-text]')
                timestamp = meta.get_attribute("data-pre-plain-text") or ""
            except:
                try:
                    ts = msg.find_element(By.XPATH, './/span[@data-testid="msg-meta"]')
                    timestamp = ts.text.strip()
                except:
                    pass

            results.append({
                "Sender": sender,
                "Message": text,
                "Timestamp": timestamp
            })
        except:
            continue

    return results


def safe_filename(name):
    """Make a filesystem-safe name."""
    for ch in ['\\', '/', ':', '*', '?', '"', '<', '>', '|']:
        name = name.replace(ch, '_')
    return name.strip()[:60] or "unnamed"


# -------- MAIN LOOP --------
print(f"\n🔄 Starting extraction...")

total_saved = 0
for i in range(MAX_CHATS):
    try:
        # Always re-fetch chat rows (WhatsApp virtualizes the list)
        chats = get_chat_rows()

        if i >= len(chats):
            print(f"\n📋 Reached end of chat list ({i} chats)")
            break

        # Click this chat
        if not click_chat(chats[i]):
            print(f"⏭️  Chat #{i + 1}: not a valid chat, skipping")
            continue

        # Get name
        name = get_chat_name() or f"chat_{i}"
        print(f"\n{'─' * 50}")
        print(f"📥 [{i + 1}] {name}")

        # Get number
        number = get_contact_number()
        print(f"📞 {number or '(no number)'}")

        # Extract messages
        messages = scroll_and_extract_messages()
        print(f"    💬 {len(messages)} text messages found")

        if messages:
            # Build dataframe
            df = pd.DataFrame(messages)
            df.insert(0, "Name", name)
            df.insert(1, "Number", number)

            fname = safe_filename(name)
            path = f"chats/{fname}.csv"
            df.to_csv(path, index=False, encoding="utf-8-sig")
            print(f"    ✅ Saved → {path}")
            total_saved += 1
        else:
            print(f"    ⚠️ No text messages to save")

    except Exception as e:
        print(f"❌ Chat #{i + 1} error: {e}")
        try:
            driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.ESCAPE)
            time.sleep(0.5)
        except:
            pass
        continue

print("\n" + "═" * 50)
print(f"🎉 DONE — {total_saved} chats saved")
print(f"📂 All data in → ./chats/")
print("═" * 50)

driver.quit()
