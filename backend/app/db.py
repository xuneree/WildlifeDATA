import os

from sqlalchemy import create_engine


def get_engine():
    return create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
