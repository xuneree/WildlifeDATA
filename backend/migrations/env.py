from alembic import context

from app.db import get_engine
from app.models import metadata

with get_engine().connect() as connection:
    context.configure(connection=connection, target_metadata=metadata)
    with context.begin_transaction():
        context.run_migrations()
