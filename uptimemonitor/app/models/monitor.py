from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


# ── Monitor ────────────────────────────────────────────────
class MonitorCreate(BaseModel):
    name: str
    url:  str
    interval_minutes: Optional[int] = 5    # how often to check


class Monitor(BaseModel):
    id:               str
    name:             str
    url:              str
    interval_minutes: int
    paused:           bool
    created_at:       str

    @classmethod
    def new(cls, data: MonitorCreate) -> "Monitor":
        return cls(
            id=str(uuid.uuid4()),
            name=data.name,
            url=data.url,
            interval_minutes=data.interval_minutes,
            paused=False,
            created_at=datetime.utcnow().isoformat(),
        )


# ── Check (ping result) ────────────────────────────────────
class Check(BaseModel):
    monitor_id:  str
    checked_at:  str           # ISO timestamp — also the sort key
    status:      str           # "up" or "down"
    status_code: Optional[int] = None
    response_ms: Optional[int] = None
    error:       Optional[str] = None


# ── Monitor with latest status (for dashboard) ─────────────
class MonitorStatus(BaseModel):
    monitor:       Monitor
    latest_check:  Optional[Check] = None
    uptime_pct:    Optional[float] = None   # 0-100
    avg_response:  Optional[float] = None   # ms
