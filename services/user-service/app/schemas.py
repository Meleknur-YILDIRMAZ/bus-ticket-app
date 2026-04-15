from pydantic import BaseModel
from typing import Optional


class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: str
    tc_no: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True
