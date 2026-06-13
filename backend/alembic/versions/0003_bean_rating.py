"""bean rating

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-13

"""
from alembic import op
import sqlalchemy as sa


revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("beans", sa.Column("rating", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("beans", "rating")
