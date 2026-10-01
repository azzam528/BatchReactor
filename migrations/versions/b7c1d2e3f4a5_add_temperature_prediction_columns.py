"""add temperature prediction columns

Revision ID: b7c1d2e3f4a5
Revises: cf44cda9a4b2
Create Date: 2026-10-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7c1d2e3f4a5'
down_revision: Union[str, Sequence[str], None] = 'cf44cda9a4b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ("prediction_history", "simulation_history")


def upgrade() -> None:
    for t in TABLES:
        op.add_column(t, sa.Column('predicted_temperature', sa.Float(), nullable=True))
        op.add_column(t, sa.Column('prediction_error', sa.Float(), nullable=True))
        op.alter_column(t, 'predicted_class', existing_type=sa.String(length=50), nullable=True)
        op.alter_column(t, 'probability', existing_type=sa.Float(), nullable=True)


def downgrade() -> None:
    for t in TABLES:
        op.alter_column(t, 'probability', existing_type=sa.Float(), nullable=False)
        op.alter_column(t, 'predicted_class', existing_type=sa.String(length=50), nullable=False)
        op.drop_column(t, 'prediction_error')
        op.drop_column(t, 'predicted_temperature')
