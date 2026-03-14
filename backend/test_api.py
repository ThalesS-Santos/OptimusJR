import requests
import sys

BASE_URL = "http://localhost:8000/api"

def test_workflow():
    print("Testing Backend API...")
    
    # 1. Register User
    print("\n1. Testing Registration...")
    reg_data = {
        "email": "test_director@ej.com",
        "password": "123",
        "name": "Test Director",
        "role": "Diretor",
        "dept": "Marketing"
    }
    try:
        r = requests.post(f"{BASE_URL}/register", json=reg_data)
        if r.status_code == 200:
            print("✅ Registration Successful")
        elif r.status_code == 400 and "already exists" in r.text:
            print("⚠️ User already exists (Skipping)")
        else:
            print(f"❌ Registration Failed: {r.text}")
    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        return

    # 2. Login
    print("\n2. Testing Login...")
    login_data = {"email": "test_director@ej.com", "password": "123"}
    r = requests.post(f"{BASE_URL}/login", json=login_data)
    if r.status_code == 200:
        print("✅ Login Successful")
        print(f"   User Info: {r.json()}")
    else:
        print(f"❌ Login Failed: {r.text}")

    # 3. Get Users
    print("\n3. Testing Get Users...")
    r = requests.get(f"{BASE_URL}/users")
    if r.status_code == 200:
        print(f"✅ Users List Retrieved: {len(r.json())} users found")
    else:
        print(f"❌ Get Users Failed: {r.text}")

if __name__ == "__main__":
    test_workflow()
