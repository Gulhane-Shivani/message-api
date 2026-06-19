import json
import urllib.request
import urllib.parse
import sys

BASE_URL = "http://localhost:8000/api"

def make_request(url, method="GET", body=None):
    req = urllib.request.Request(url, method=method)
    if body is not None:
        req.add_header("Content-Type", "application/json")
        data = json.dumps(body).encode("utf-8")
    else:
        data = None
        
    try:
        with urllib.request.urlopen(req, data=data) as response:
            res_data = response.read().decode("utf-8")
            if res_data:
                return json.loads(res_data)
            return None
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        return None
    except Exception as e:
        print(f"Connection Error: {e}")
        return None

def test_all():
    print("=== Testing Messages API ===")
    
    # 1. Login
    print("\n1. Testing POST /api/login (test@.com logging in)...")
    login_payload = {"email": "test@.com", "password": "password123"}
    login_res = make_request(f"{BASE_URL}/login", "POST", login_payload)
    print("Response:", login_res)
    if not login_res or not login_res.get("status"):
        print("Login failed! Ensure backend is running and setup_db.py was executed.")
        sys.exit(1)
    
    alice_id = login_res["user"]["id"]
    
    # 2. Get Users
    print("\n2. Testing GET /api/users...")
    users_res = make_request(f"{BASE_URL}/users", "GET")
    print("Users list:", users_res)
    if not users_res:
        print("Failed to get users!")
        sys.exit(1)
        
    # Get Bob's ID
    bob_id = next((u["id"] for u in users_res if u["email"] == "bob@example.com"), None)
    charlie_id = next((u["id"] for u in users_res if u["email"] == "charlie@example.com"), None)
    
    # 3. Get Inbox
    print(f"\n3. Testing GET /api/inbox for Bob (user_id={bob_id})...")
    inbox_res = make_request(f"{BASE_URL}/inbox?user_id={bob_id}", "GET")
    print("Inbox:", inbox_res)
    
    # 4. Send Message
    print(f"\n4. Testing POST /api/send_message (Alice sending to Bob and Charlie)...")
    send_payload = {
        "sender_id": alice_id,
        "receiver_ids": [bob_id, charlie_id],
        "subject": "Test Message",
        "message": "This is a test message from Alice."
    }
    send_res = make_request(f"{BASE_URL}/send_message", "POST", send_payload)
    print("Send Message Response:", send_res)
    
    # Get the latest message for reply
    inbox_res_new = make_request(f"{BASE_URL}/inbox?user_id={bob_id}", "GET")
    latest_msg = inbox_res_new[0] if inbox_res_new else None
    
    if latest_msg:
        msg_id = latest_msg["id"]
        
        # 5. Send Reply
        print(f"\n5. Testing POST /api/send_reply (Bob replying to Alice on message {msg_id})...")
        reply_payload = {
            "message_id": msg_id,
            "sender_id": bob_id,
            "receiver_id": alice_id,
            "message": "Got your message, thanks Alice!"
        }
        reply_res = make_request(f"{BASE_URL}/send_reply", "POST", reply_payload)
        print("Reply Response:", reply_res)
        
        # 6. Mark Read
        print(f"\n6. Testing POST /api/mark_read for message {msg_id}...")
        mark_payload = {"message_id": msg_id}
        mark_res = make_request(f"{BASE_URL}/mark_read", "POST", mark_payload)
        print("Mark Read Response:", mark_res)
        
        # 7. Hide Messages (inbox)
        print(f"\n7. Testing POST /api/hide_messages (Bob hiding message {msg_id})...")
        hide_msg_payload = {
            "ids": [msg_id],
            "user_id": bob_id
        }
        hide_msg_res = make_request(f"{BASE_URL}/hide_messages", "POST", hide_msg_payload)
        print("Hide Messages Response:", hide_msg_res)
        
    # 8. Hide Sent
    print(f"\n8. Testing POST /api/hide_sent (Alice hiding sent messages)...")
    # Get sent messages first
    sent_res = make_request(f"{BASE_URL}/sent?user_id={alice_id}", "GET")
    if sent_res:
        sent_msg_id = sent_res[0]["id"]
        hide_sent_payload = {
            "ids": [sent_msg_id],
            "user_id": alice_id
        }
        hide_sent_res = make_request(f"{BASE_URL}/hide_sent", "POST", hide_sent_payload)
        print("Hide Sent Response:", hide_sent_res)
    else:
        print("No sent messages found to test hide_sent.")
        
    print("\n=== API Testing Complete! ===")

if __name__ == "__main__":
    test_all()
