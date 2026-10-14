"""Initial administrator creation. Password is read from the environment, never CLI arguments."""

import os

import sqlalchemy as sa

from app.db import get_engine
from app.models import T
from app.security import hash_password


def main():
    username = os.environ.get("ADMIN_USERNAME", "admin")
    with get_engine().begin() as conn:
        users = T["app_user"]
        exists = conn.execute(sa.select(users.c.id).where(users.c.username == username)).first()
        if exists:
            print("Administrator already exists; password unchanged.")
            return
        hashed = hash_password(os.environ["ADMIN_PASSWORD"])
        conn.execute(
            users.insert().values(
                username=username,
                display_name="管理员",
                password_hash=hashed,
                role="admin",
                regions=[],
                can_view_coordinates=True,
            )
        )
        print("Administrator created.")


if __name__ == "__main__":
    main()
