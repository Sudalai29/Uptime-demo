from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import links, health
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="LinkVault API",
    description="Personal bookmark manager API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(links.router, prefix="/links", tags=["links"])

@app.on_event("startup")
async def startup():
    logger.info("LinkVault API starting up...")
