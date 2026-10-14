from pathlib import Path

from alembic import op

revision = "0001"
down_revision = None


def upgrade():
    op.execute(Path(__file__).with_name("0001_initial.sql").read_text())


def downgrade():
    raise RuntimeError("Initial business schema cannot be dropped automatically; restore a reviewed backup.")
