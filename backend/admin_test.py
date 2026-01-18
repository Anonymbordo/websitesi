from fastapi import APIRouter

test_router = APIRouter()

@test_router.get("/test")
async def test_endpoint():
    return {"message": "Test admin router works!"}
