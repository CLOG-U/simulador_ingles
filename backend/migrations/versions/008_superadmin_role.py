"""add SUPERADMIN role and promote existing admins

Revision ID: 008_superadmin_role
Revises: 007_remove_practice_cap
Create Date: 2026-08-09
"""

from collections.abc import Sequence

from alembic import op

revision: str = "008_superadmin_role"
down_revision: str | None = "007_remove_practice_cap"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ADD VALUE cannot run inside a normal transaction on some Postgres versions.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPERADMIN'")
    # Existing professor/admin accounts become the protected superadmin tier.
    op.execute("UPDATE users SET role = 'SUPERADMIN' WHERE role = 'ADMIN'")


def downgrade() -> None:
    # Postgres cannot easily remove enum values; demote superadmins back to ADMIN.
    op.execute("UPDATE users SET role = 'ADMIN' WHERE role = 'SUPERADMIN'")
