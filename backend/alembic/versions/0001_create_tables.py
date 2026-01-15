"""create tables

Revision ID: 0001
Revises: 
Create Date: 2024-10-01

"""
from alembic import op
import sqlalchemy as sa


revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "beans",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("roaster", sa.String(), nullable=True),
        sa.Column("origin", sa.String(), nullable=True),
        sa.Column("process", sa.String(), nullable=True),
        sa.Column("roast_level", sa.String(), nullable=True),
        sa.Column("tasting_notes", sa.String(), nullable=True),
        sa.Column("roast_date", sa.Date(), nullable=True),
        sa.Column("open_date", sa.Date(), nullable=True),
        sa.Column("bag_size_g", sa.Integer(), nullable=True),
        sa.Column("price", sa.Float(), nullable=True),
        sa.Column("decaf", sa.Boolean(), default=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("image_path", sa.String(), nullable=True),
        sa.Column("thumbnail_path", sa.String(), nullable=True),
        sa.Column("archived", sa.Boolean(), default=False),
        sa.Column("current_best_settings", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "drink_logs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("bean_id", sa.String(), sa.ForeignKey("beans.id"), nullable=False),
        sa.Column("drink_type", sa.String(), nullable=False),
        sa.Column("custom_label", sa.String(), nullable=True),
        sa.Column("made_by", sa.String(), nullable=True),
        sa.Column("rated_by", sa.String(), nullable=True),
        sa.Column("temperature_level", sa.String(), nullable=False),
        sa.Column("body_level", sa.String(), nullable=False),
        sa.Column("order", sa.String(), nullable=False),
        sa.Column("coffee_volume_ml", sa.Float(), nullable=False),
        sa.Column("milk_volume_ml", sa.Float(), nullable=False),
        sa.Column("strength_level", sa.String(), nullable=False),
        sa.Column("grind_setting", sa.Integer(), nullable=False),
        sa.Column("overall_rating", sa.Integer(), nullable=False),
        sa.Column("sweetness", sa.Integer(), nullable=False),
        sa.Column("bitterness", sa.Integer(), nullable=False),
        sa.Column("acidity", sa.Integer(), nullable=False),
        sa.Column("body_mouthfeel", sa.Integer(), nullable=False),
        sa.Column("balance", sa.Integer(), nullable=False),
        sa.Column("would_make_again", sa.Boolean(), default=False),
        sa.Column("dialed_in", sa.Boolean(), default=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("photo_path", sa.String(), nullable=True),
        sa.Column("thumbnail_path", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("drink_logs")
    op.drop_table("beans")
