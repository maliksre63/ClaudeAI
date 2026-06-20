from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, index=True, nullable=False)
    username      = Column(String, unique=True, index=True, nullable=False)
    hashed_pw     = Column(String, nullable=False)
    is_active     = Column(Boolean, default=True)
    plan          = Column(String, default="free")
    virtual_cash  = Column(Float, default=999999.0)   # unlimited — not shown in UI
    xp            = Column(Integer, default=0)
    level         = Column(Integer, default=1)
    streak        = Column(Integer, default=0)
    last_login    = Column(String, default="")
    risk_profile  = Column(String, default="moderat")
    lang          = Column(String, default="de")
    badges        = Column(JSON, default=list)
    done_lessons  = Column(JSON, default=list)
    onboarding_done = Column(Boolean, default=False)
    interests     = Column(JSON, default=list)         # ["tech","krypto","etf","dividenden"]
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    trades        = relationship("Trade", back_populates="user")
    portfolio     = relationship("Position", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")
    emotions      = relationship("EmotionLog", back_populates="user")
    watchlist     = relationship("WatchlistItem", back_populates="user")


class Position(Base):
    __tablename__ = "positions"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker     = Column(String, nullable=False)
    name       = Column(String, default="")
    asset_type = Column(String, default="stock")
    shares     = Column(Float, nullable=False)
    avg_price  = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="portfolio")


class Trade(Base):
    __tablename__ = "trades"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker     = Column(String, nullable=False)
    name       = Column(String, default="")
    asset_type = Column(String, default="stock")
    action     = Column(String, nullable=False)
    shares     = Column(Float, nullable=False)
    price      = Column(Float, nullable=False)
    total      = Column(Float, nullable=False)
    emotion    = Column(String, default="")
    note       = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="trades")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    messages   = Column(JSON, default=list)
    context    = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="chat_sessions")


class EmotionLog(Base):
    __tablename__ = "emotion_logs"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    emotion    = Column(String, nullable=False)
    trigger    = Column(String, default="")
    ticker     = Column(String, default="")
    note       = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="emotions")


class WatchlistItem(Base):
    __tablename__ = "watchlist"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker     = Column(String, nullable=False)
    name       = Column(String, default="")
    asset_type = Column(String, default="stock")
    category   = Column(String, default="")
    group_name = Column(String, default="Beobachte ich")
    added_at   = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="watchlist")


class Lesson(Base):
    __tablename__ = "lessons"

    id          = Column(Integer, primary_key=True, index=True)
    slug        = Column(String, unique=True, nullable=False)
    title       = Column(String, nullable=False)
    description = Column(Text, default="")
    content     = Column(Text, default="")
    level_req   = Column(Integer, default=1)
    xp_reward   = Column(Integer, default=50)
    badge       = Column(String, default="")
    order_index = Column(Integer, default=0)


class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id        = Column(Integer, primary_key=True, index=True)
    user_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker    = Column(String, nullable=False)
    name      = Column(String, default="")
    direction = Column(String, nullable=False)  # "below" | "above"
    target    = Column(Float, nullable=False)
    triggered = Column(Boolean, default=False)
    active    = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
