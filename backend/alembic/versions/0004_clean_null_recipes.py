"""remove backfilled recipes that have no settings

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-13

The 0002 backfill copied a bean's current_best_settings into an Espresso recipe.
When that value was JSON null, it produced a bean_recipes row with a null
settings blob, which fails BeanOut serialization. Drop those empty rows.
"""
from alembic import op


revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DELETE FROM bean_recipes WHERE settings IS NULL OR settings = 'null'")


def downgrade() -> None:
    pass
