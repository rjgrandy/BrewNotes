"""bean recipes and photos

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-12

"""
import json
import uuid
from datetime import datetime

from alembic import op
import sqlalchemy as sa


revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bean_recipes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("bean_id", sa.String(), sa.ForeignKey("beans.id"), nullable=False, index=True),
        sa.Column("drink_type", sa.String(), nullable=False),
        sa.Column("settings", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(), nullable=True),
        sa.Column("source_drink_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("bean_id", "drink_type", name="uq_bean_recipe_drink_type"),
    )
    op.create_table(
        "bean_photos",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("bean_id", sa.String(), sa.ForeignKey("beans.id"), nullable=False, index=True),
        sa.Column("image_path", sa.String(), nullable=False),
        sa.Column("thumbnail_path", sa.String(), nullable=False),
        sa.Column("caption", sa.String(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    # ---- Backfill from existing bean fields ----
    bind = op.get_bind()
    now = datetime.utcnow().isoformat(sep=" ")
    beans = bind.execute(
        sa.text("SELECT id, current_best_settings, image_path, thumbnail_path FROM beans")
    ).fetchall()
    for bean_id, best_settings, image_path, thumbnail_path in beans:
        if best_settings:
            settings_text = best_settings if isinstance(best_settings, str) else json.dumps(best_settings)
            bind.execute(
                sa.text(
                    "INSERT INTO bean_recipes "
                    "(id, bean_id, drink_type, settings, source, created_at, updated_at) "
                    "VALUES (:id, :bean_id, 'Espresso', :settings, 'manual', :now, :now)"
                ),
                {"id": str(uuid.uuid4()), "bean_id": bean_id, "settings": settings_text, "now": now},
            )
        if image_path:
            bind.execute(
                sa.text(
                    "INSERT INTO bean_photos "
                    "(id, bean_id, image_path, thumbnail_path, sort_order, created_at) "
                    "VALUES (:id, :bean_id, :image_path, :thumbnail_path, 0, :now)"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "bean_id": bean_id,
                    "image_path": image_path,
                    "thumbnail_path": thumbnail_path or image_path,
                    "now": now,
                },
            )


def downgrade() -> None:
    op.drop_table("bean_photos")
    op.drop_table("bean_recipes")
