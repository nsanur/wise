# # core/auth.py
# from fastapi import APIRouter, HTTPException, Form

# router = APIRouter()

# # Dummy user store
# users = {"demo@example.com": {"password": "password123", "full_name": "Demo User"}}

# @router.post("/api/auth/login/")
# async def login(email: str = Form(...), password: str = Form(...)):
#     user = users.get(email)
#     if user and user["password"] == password:
#         return {"success": True, "full_name": user["full_name"]}
#     raise HTTPException(status_code=401, detail="Geçersiz e-posta ya da şifre")

# @router.post("/api/auth/register/")
# async def register(email: str = Form(...), password: str = Form(...), full_name: str = Form(...)):
#     if email in users:
#         raise HTTPException(status_code=400, detail="E-posta zaten kayıtlı")
#     users[email] = {"password": password, "full_name": full_name}
#     return {"success": True}