"""V1.2 fields extracted from the supplied database design; constraints are explicit."""

import json
import re
import uuid
from pathlib import Path

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

metadata = sa.MetaData(
    naming_convention={
        "ix": "ix_%(table_name)s_%(column_0_name)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }
)
spec = json.loads(Path(__file__).with_name("schema.json").read_text())
FK = {
    "camera_deployment.site_id": "camera_site.id",
    "media_asset.camera_deployment_id": "camera_deployment.id",
    "media_derivative.media_id": "media_asset.id",
    "species_annotation.media_id": "media_asset.id",
    "species_annotation.species_id": "species.id",
    "species_annotation.annotation_import_id": "annotation_import.id",
    "annotation_import_item.annotation_import_id": "annotation_import.id",
    "annotation_import_item.media_id": "media_asset.id",
    "media_tag.media_id": "media_asset.id",
    "media_tag.tag_id": "tag.id",
    "individual.species_id": "species.id",
    "individual_profile.individual_id": "individual.id",
    "individual_alias.individual_id": "individual.id",
    "individual_occurrence.media_id": "media_asset.id",
    "individual_occurrence.individual_id": "individual.id",
    "individual_relationship.individual_id": "individual.id",
    "individual_relationship.related_individual_id": "individual.id",
    "breeding_event.mother_id": "individual.id",
    "breeding_event.father_id": "individual.id",
    "breeding_event.birth_site_id": "camera_site.id",
    "breeding_offspring.breeding_event_id": "breeding_event.id",
    "breeding_offspring.individual_id": "individual.id",
    "breeding_evidence.breeding_event_id": "breeding_event.id",
    "breeding_evidence.media_id": "media_asset.id",
    "audit_log.actor_id": "app_user.id",
}


def sql_type(value):
    if value.startswith("VARCHAR"):
        return sa.String(int(re.search(r"\d+", value)[0]))
    if value.startswith("NUMERIC"):
        a, b = map(int, re.findall(r"\d+", value))
        return sa.Numeric(a, b)
    return {
        "UUID": sa.Uuid,
        "TEXT": sa.Text,
        "TIMESTAMPTZ": lambda: sa.DateTime(timezone=True),
        "DATE": sa.Date,
        "DOUBLE PRECISION": sa.Double,
        "BIGINT": sa.BigInteger,
        "INTEGER": sa.Integer,
        "BOOLEAN": sa.Boolean,
        "JSONB": JSONB,
    }[value]()


for name, fields in spec.items():
    columns = []
    for field in fields:
        col = field["name"]
        default = field["default"]
        opts = {"primary_key": col == "id", "nullable": field["required"] != "必填"}
        if col == "id":
            opts["default"] = uuid.uuid4
        elif default != "—":
            opts["server_default"] = sa.text(default) if default in ("now()", "true", "0") else default
        args = [sa.ForeignKey(FK[f"{name}.{col}"])] if f"{name}.{col}" in FK else []
        columns.append(sa.Column(col, sql_type(field["type"]), *args, **opts))
    if name == "app_user":
        columns.extend(
            [
                sa.Column("password_hash", sa.Text, nullable=False),
                sa.Column("role", sa.String(20), nullable=False, server_default="viewer"),
                sa.Column("regions", sa.JSON, nullable=False, server_default="[]"),
                sa.Column("can_view_coordinates", sa.Boolean, nullable=False, server_default=sa.false()),
            ]
        )
    sa.Table(name, metadata, *columns)

T = metadata.tables


def check(name, expression):
    T[name].append_constraint(sa.CheckConstraint(expression))


def unique(name, *columns):
    T[name].append_constraint(sa.UniqueConstraint(*columns))


def enum(name, col, values):
    check(name, f"{col} IN ({','.join(repr(x) for x in values.split())})")


for name, cols in {
    "camera_site": [("region", "site_code")],
    "camera_deployment": [("site_id", "device_code", "data_retrieval_batch")],
    "media_asset": [("storage_path",)],
    "species": [("species_code",)],
    "species_annotation": [("media_id", "species_id")],
    "tag": [("tag_code",)],
    "media_tag": [("media_id", "tag_id")],
    "individual": [("individual_code",)],
    "individual_profile": [("individual_id", "id")],
    "individual_alias": [("alias_code",)],
    "individual_occurrence": [("media_id", "individual_id")],
    "breeding_event": [("event_code",)],
    "breeding_offspring": [("breeding_event_id", "temporary_cub_code")],
    "breeding_evidence": [("breeding_event_id", "media_id")],
    "app_user": [("username",)],
}.items():
    for cols_ in cols:
        unique(name, *cols_)

# Composite FK prevents selecting another individual's representative image.
T["individual"].append_constraint(
    sa.ForeignKeyConstraint(
        ["id", "profile_id"],
        ["individual_profile.individual_id", "individual_profile.id"],
        name="fk_individual_own_profile",
        use_alter=True,
    )
)
for args in [
    ("camera_site", "deployment_type", "single paired"),
    ("camera_deployment", "data_retrieval_status", "retrieved not_retrieved"),
    ("media_asset", "media_type", "video image"),
    ("media_asset", "individual_annotation_status", "unannotated annotated"),
    ("individual", "sex", "male female unknown"),
    ("individual", "life_status", "alive confirmed_dead unknown"),
    ("app_user", "role", "admin viewer"),
    ("media_derivative", "derivative_type", "proxy_video thumbnail frame_capture"),
    ("annotation_import_item", "import_status", "success failed skipped"),
    ("breeding_offspring", "survival_status", "alive confirmed_dead unknown"),
    ("breeding_offspring", "territory_established_status", "confirmed unconfirmed unknown"),
]:
    enum(*args)
for name in ("annotation_import", "species_annotation", "individual_occurrence"):
    enum(name, "review_status", "unreviewed reviewed")
check("camera_site", "(longitude IS NULL) = (latitude IS NULL)")
check("camera_site", "longitude BETWEEN -180 AND 180 AND latitude BETWEEN -90 AND 90")
check("camera_deployment", "work_end_at >= work_start_at")
for col in ("file_size_bytes", "duration_seconds", "width", "height"):
    check("media_asset", f"{col} >= 0")
for name in ("individual", "breeding_event"):
    check(name, "birth_date_to >= birth_date_from")
check("individual", "individual_code <> 'unknown_individual'")
check("individual_alias", "alias_code <> 'unknown_individual'")
check("individual_relationship", "individual_id <> related_individual_id")
check("breeding_event", "mother_id <> father_id")
check("breeding_event", "cub_count_observed >= 0")
check(
    "annotation_import",
    "total_file_count >= 0 AND success_file_count >= 0 AND failed_file_count >= 0 "
    "AND success_file_count + failed_file_count <= total_file_count",
)
for name, columns in [
    ("media_asset", ["camera_deployment_id", "captured_at"]),
    ("media_asset", ["individual_annotation_status"]),
    ("species_annotation", ["species_id", "media_id"]),
    ("individual_occurrence", ["individual_id", "media_id"]),
    ("breeding_event", ["mother_id", "breeding_year"]),
    ("media_derivative", ["media_id", "derivative_type"]),
]:
    sa.Index("ix_" + name + "_" + "_".join(columns), *(T[name].c[c] for c in columns))
