from fastapi import FastAPI, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import backend.database as db
import os

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    role: str
    dept: str

class UserResponse(BaseModel):
    email: str
    name: str
    role: str
    dept: str

# API Endpoints

@app.post("/api/login")
async def login(user: UserLogin):
    user_data = db.authenticate_user(user.email, user.password)
    if user_data:
        # Don't return password
        user_data.pop("password", None)
        return user_data
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/register")
async def register(user: UserRegister):
    result = db.save_user(user.email, user.password, user.name, user.role, user.dept)
    if result:
        result.pop("password", None)
        return result
    raise HTTPException(status_code=400, detail="User already exists")

@app.get("/api/users")
async def get_users(role: Optional[str] = None, dept: Optional[str] = None):
    if role:
        return db.get_users_by_role(role, dept)
    return db.get_all_users()

class UserUpdate(BaseModel):
    name: str
    email: str

@app.put("/api/users/{email}")
async def update_user_endpoint(email: str, user: UserUpdate):
    success = db.update_user(email, user.name, user.email)
    if not success:
         raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User updated"}

# --- New Data Endpoints ---
from backend import data_manager

@app.get("/api/data/{key}")
async def get_generic_data(key: str):
    return data_manager.get_data(key)

class GenericDataPayload(BaseModel):
    data: dict | list

@app.post("/api/data/{key}")
async def save_generic_data(key: str, payload: GenericDataPayload):
    # In a real app we would validate permissions here too
    return data_manager.save_data(key, payload.data)

# Serve Frontend
# We need to make sure the frontend directory exists before mounting
if os.path.exists("frontend"):
    app.mount("/", StaticFiles(directory="frontend", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
