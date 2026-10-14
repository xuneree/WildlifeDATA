CREATE EXTENSION IF NOT EXISTS postgis;


CREATE TABLE annotation_import (
	id UUID NOT NULL,
	imported_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	imported_by VARCHAR(100),
	annotated_by VARCHAR(100),
	review_status VARCHAR(20) DEFAULT 'unreviewed' NOT NULL,
	reviewed_by VARCHAR(100),
	total_file_count INTEGER DEFAULT 0 NOT NULL,
	success_file_count INTEGER DEFAULT 0 NOT NULL,
	failed_file_count INTEGER DEFAULT 0 NOT NULL,
	notes TEXT,
	CONSTRAINT pk_annotation_import PRIMARY KEY (id),
	CHECK (review_status IN ('unreviewed','reviewed')),
	CHECK (total_file_count >= 0 AND success_file_count >= 0 AND failed_file_count >= 0 AND success_file_count + failed_file_count <= total_file_count)
)

;


CREATE TABLE app_user (
	id UUID NOT NULL,
	username VARCHAR(100) NOT NULL,
	display_name VARCHAR(100),
	is_active BOOLEAN DEFAULT true NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	password_hash TEXT NOT NULL,
	role VARCHAR(20) DEFAULT 'viewer' NOT NULL,
	regions JSON DEFAULT '[]' NOT NULL,
	can_view_coordinates BOOLEAN DEFAULT false NOT NULL,
	CONSTRAINT pk_app_user PRIMARY KEY (id),
	CONSTRAINT uq_app_user_username UNIQUE (username),
	CHECK (role IN ('admin','viewer'))
)

;


CREATE TABLE camera_site (
	id UUID NOT NULL,
	site_code VARCHAR(50) NOT NULL,
	region VARCHAR(100) NOT NULL,
	first_deployed_at TIMESTAMP WITH TIME ZONE,
	deployment_type VARCHAR(20) NOT NULL,
	longitude DOUBLE PRECISION,
	latitude DOUBLE PRECISION,
	elevation_m NUMERIC(8, 2),
	terrain_type VARCHAR(50),
	vegetation_type VARCHAR(100),
	environment_type VARCHAR(100),
	notes TEXT,
	CONSTRAINT pk_camera_site PRIMARY KEY (id),
	CONSTRAINT uq_camera_site_region UNIQUE (region, site_code),
	CHECK (deployment_type IN ('single','paired')),
	CHECK ((longitude IS NULL) = (latitude IS NULL)),
	CHECK (longitude BETWEEN -180 AND 180 AND latitude BETWEEN -90 AND 90)
)

;


CREATE TABLE species (
	id UUID NOT NULL,
	species_code VARCHAR(50) NOT NULL,
	common_name VARCHAR(100) NOT NULL,
	scientific_name VARCHAR(200),
	notes TEXT,
	CONSTRAINT pk_species PRIMARY KEY (id),
	CONSTRAINT uq_species_species_code UNIQUE (species_code)
)

;


CREATE TABLE tag (
	id UUID NOT NULL,
	tag_code VARCHAR(50) NOT NULL,
	tag_name VARCHAR(100) NOT NULL,
	tag_type VARCHAR(30),
	description TEXT,
	CONSTRAINT pk_tag PRIMARY KEY (id),
	CONSTRAINT uq_tag_tag_code UNIQUE (tag_code)
)

;


CREATE TABLE audit_log (
	id UUID NOT NULL,
	actor_id UUID,
	action VARCHAR(100) NOT NULL,
	entity_type VARCHAR(100) NOT NULL,
	entity_id UUID,
	before_data JSONB,
	after_data JSONB,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	CONSTRAINT pk_audit_log PRIMARY KEY (id),
	CONSTRAINT fk_audit_log_actor_id_app_user FOREIGN KEY(actor_id) REFERENCES app_user (id)
)

;


CREATE TABLE camera_deployment (
	id UUID NOT NULL,
	site_id UUID NOT NULL,
	device_code VARCHAR(50) NOT NULL,
	device_type VARCHAR(100),
	work_start_at TIMESTAMP WITH TIME ZONE,
	work_end_at TIMESTAMP WITH TIME ZONE,
	maintenance_at TIMESTAMP WITH TIME ZONE,
	maintenance_by TEXT,
	data_retrieval_at TIMESTAMP WITH TIME ZONE,
	data_retrieval_batch VARCHAR(20) NOT NULL,
	data_retrieval_status VARCHAR(20) NOT NULL,
	issue_type VARCHAR(50),
	notes TEXT,
	CONSTRAINT pk_camera_deployment PRIMARY KEY (id),
	CONSTRAINT fk_camera_deployment_site_id_camera_site FOREIGN KEY(site_id) REFERENCES camera_site (id),
	CONSTRAINT uq_camera_deployment_site_id UNIQUE (site_id, device_code, data_retrieval_batch),
	CHECK (data_retrieval_status IN ('retrieved','not_retrieved')),
	CHECK (work_end_at >= work_start_at)
)

;


CREATE TABLE individual (
	id UUID NOT NULL,
	individual_code VARCHAR(50) NOT NULL,
	species_id UUID NOT NULL,
	profile_id UUID,
	sex VARCHAR(20) DEFAULT 'unknown' NOT NULL,
	birth_date_from DATE,
	birth_date_to DATE,
	life_status VARCHAR(30) DEFAULT 'unknown' NOT NULL,
	notes TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	CONSTRAINT pk_individual PRIMARY KEY (id),
	CONSTRAINT fk_individual_species_id_species FOREIGN KEY(species_id) REFERENCES species (id),
	CONSTRAINT uq_individual_individual_code UNIQUE (individual_code),
	CHECK (sex IN ('male','female','unknown')),
	CHECK (life_status IN ('alive','confirmed_dead','unknown')),
	CHECK (birth_date_to >= birth_date_from),
	CHECK (individual_code <> 'unknown_individual')
)

;


CREATE TABLE breeding_event (
	id UUID NOT NULL,
	event_code VARCHAR(100) NOT NULL,
	mother_id UUID NOT NULL,
	father_id UUID,
	breeding_year INTEGER,
	birth_date_from DATE,
	birth_date_to DATE,
	first_observed_at TIMESTAMP WITH TIME ZONE,
	cub_count_observed INTEGER,
	birth_site_id UUID,
	maternal_solo_activity_at TIMESTAMP WITH TIME ZONE,
	breeding_status VARCHAR(30),
	notes TEXT,
	CONSTRAINT pk_breeding_event PRIMARY KEY (id),
	CONSTRAINT fk_breeding_event_mother_id_individual FOREIGN KEY(mother_id) REFERENCES individual (id),
	CONSTRAINT fk_breeding_event_father_id_individual FOREIGN KEY(father_id) REFERENCES individual (id),
	CONSTRAINT fk_breeding_event_birth_site_id_camera_site FOREIGN KEY(birth_site_id) REFERENCES camera_site (id),
	CONSTRAINT uq_breeding_event_event_code UNIQUE (event_code),
	CHECK (birth_date_to >= birth_date_from),
	CHECK (mother_id <> father_id),
	CHECK (cub_count_observed >= 0)
)

;

CREATE INDEX ix_breeding_event_mother_id_breeding_year ON breeding_event (mother_id, breeding_year);


CREATE TABLE individual_alias (
	id UUID NOT NULL,
	individual_id UUID NOT NULL,
	alias_code VARCHAR(50) NOT NULL,
	changed_at TIMESTAMP WITH TIME ZONE,
	notes TEXT,
	CONSTRAINT pk_individual_alias PRIMARY KEY (id),
	CONSTRAINT fk_individual_alias_individual_id_individual FOREIGN KEY(individual_id) REFERENCES individual (id),
	CONSTRAINT uq_individual_alias_alias_code UNIQUE (alias_code),
	CHECK (alias_code <> 'unknown_individual')
)

;


CREATE TABLE individual_profile (
	id UUID NOT NULL,
	individual_id UUID NOT NULL,
	filename TEXT NOT NULL,
	storage_path TEXT NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	notes TEXT,
	CONSTRAINT pk_individual_profile PRIMARY KEY (id),
	CONSTRAINT fk_individual_profile_individual_id_individual FOREIGN KEY(individual_id) REFERENCES individual (id),
	CONSTRAINT uq_individual_profile_individual_id UNIQUE (individual_id, id)
)

;


CREATE TABLE individual_relationship (
	id UUID NOT NULL,
	individual_id UUID NOT NULL,
	related_individual_id UUID NOT NULL,
	relationship_type VARCHAR(30) NOT NULL,
	confidence_level VARCHAR(20),
	notes TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	CONSTRAINT pk_individual_relationship PRIMARY KEY (id),
	CONSTRAINT fk_individual_relationship_individual_id_individual FOREIGN KEY(individual_id) REFERENCES individual (id),
	CONSTRAINT fk_individual_relationship_related_individual_id_individual FOREIGN KEY(related_individual_id) REFERENCES individual (id),
	CHECK (individual_id <> related_individual_id)
)

;


CREATE TABLE media_asset (
	id UUID NOT NULL,
	camera_deployment_id UUID NOT NULL,
	media_type VARCHAR(10) NOT NULL,
	filename TEXT NOT NULL,
	storage_path TEXT NOT NULL,
	file_size_bytes BIGINT,
	file_hash VARCHAR(64),
	captured_at TIMESTAMP WITH TIME ZONE,
	time_corrected_at TIMESTAMP WITH TIME ZONE,
	duration_seconds NUMERIC(12, 3),
	width INTEGER,
	height INTEGER,
	codec VARCHAR(50),
	individual_annotation_status VARCHAR(20) DEFAULT 'unannotated' NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	notes TEXT,
	CONSTRAINT pk_media_asset PRIMARY KEY (id),
	CONSTRAINT fk_media_asset_camera_deployment_id_camera_deployment FOREIGN KEY(camera_deployment_id) REFERENCES camera_deployment (id),
	CONSTRAINT uq_media_asset_storage_path UNIQUE (storage_path),
	CHECK (media_type IN ('video','image')),
	CHECK (individual_annotation_status IN ('unannotated','annotated')),
	CHECK (file_size_bytes >= 0),
	CHECK (duration_seconds >= 0),
	CHECK (width >= 0),
	CHECK (height >= 0)
)

;

CREATE INDEX ix_media_asset_individual_annotation_status ON media_asset (individual_annotation_status);

CREATE INDEX ix_media_asset_camera_deployment_id_captured_at ON media_asset (camera_deployment_id, captured_at);


CREATE TABLE annotation_import_item (
	id UUID NOT NULL,
	annotation_import_id UUID NOT NULL,
	media_id UUID,
	source_filename TEXT NOT NULL,
	import_status VARCHAR(20) NOT NULL,
	species_codes JSONB,
	previous_species_codes JSONB,
	error_message TEXT,
	CONSTRAINT pk_annotation_import_item PRIMARY KEY (id),
	CONSTRAINT fk_annotation_import_item_annotation_import_id_annotati_8cc0 FOREIGN KEY(annotation_import_id) REFERENCES annotation_import (id),
	CONSTRAINT fk_annotation_import_item_media_id_media_asset FOREIGN KEY(media_id) REFERENCES media_asset (id),
	CHECK (import_status IN ('success','failed','skipped'))
)

;


CREATE TABLE breeding_evidence (
	id UUID NOT NULL,
	breeding_event_id UUID NOT NULL,
	media_id UUID NOT NULL,
	evidence_type VARCHAR(50),
	notes TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	CONSTRAINT pk_breeding_evidence PRIMARY KEY (id),
	CONSTRAINT fk_breeding_evidence_breeding_event_id_breeding_event FOREIGN KEY(breeding_event_id) REFERENCES breeding_event (id),
	CONSTRAINT fk_breeding_evidence_media_id_media_asset FOREIGN KEY(media_id) REFERENCES media_asset (id),
	CONSTRAINT uq_breeding_evidence_breeding_event_id UNIQUE (breeding_event_id, media_id)
)

;


CREATE TABLE breeding_offspring (
	id UUID NOT NULL,
	breeding_event_id UUID NOT NULL,
	individual_id UUID,
	temporary_cub_code VARCHAR(50),
	independence_at TIMESTAMP WITH TIME ZONE,
	last_observed_at TIMESTAMP WITH TIME ZONE,
	survival_status VARCHAR(20),
	territory_established_status VARCHAR(20),
	territory_established_at TIMESTAMP WITH TIME ZONE,
	notes TEXT,
	CONSTRAINT pk_breeding_offspring PRIMARY KEY (id),
	CONSTRAINT fk_breeding_offspring_breeding_event_id_breeding_event FOREIGN KEY(breeding_event_id) REFERENCES breeding_event (id),
	CONSTRAINT fk_breeding_offspring_individual_id_individual FOREIGN KEY(individual_id) REFERENCES individual (id),
	CONSTRAINT uq_breeding_offspring_breeding_event_id UNIQUE (breeding_event_id, temporary_cub_code),
	CHECK (survival_status IN ('alive','confirmed_dead','unknown')),
	CHECK (territory_established_status IN ('confirmed','unconfirmed','unknown'))
)

;


CREATE TABLE individual_occurrence (
	id UUID NOT NULL,
	media_id UUID NOT NULL,
	individual_id UUID NOT NULL,
	annotated_by VARCHAR(100),
	annotated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	review_status VARCHAR(20) DEFAULT 'unreviewed' NOT NULL,
	reviewed_by VARCHAR(100),
	notes TEXT,
	CONSTRAINT pk_individual_occurrence PRIMARY KEY (id),
	CONSTRAINT fk_individual_occurrence_media_id_media_asset FOREIGN KEY(media_id) REFERENCES media_asset (id),
	CONSTRAINT fk_individual_occurrence_individual_id_individual FOREIGN KEY(individual_id) REFERENCES individual (id),
	CONSTRAINT uq_individual_occurrence_media_id UNIQUE (media_id, individual_id),
	CHECK (review_status IN ('unreviewed','reviewed'))
)

;

CREATE INDEX ix_individual_occurrence_individual_id_media_id ON individual_occurrence (individual_id, media_id);


CREATE TABLE media_derivative (
	id UUID NOT NULL,
	media_id UUID NOT NULL,
	derivative_type VARCHAR(30) NOT NULL,
	filename TEXT,
	storage_path TEXT NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	notes TEXT,
	CONSTRAINT pk_media_derivative PRIMARY KEY (id),
	CONSTRAINT fk_media_derivative_media_id_media_asset FOREIGN KEY(media_id) REFERENCES media_asset (id),
	CHECK (derivative_type IN ('proxy_video','thumbnail','frame_capture'))
)

;

CREATE INDEX ix_media_derivative_media_id_derivative_type ON media_derivative (media_id, derivative_type);


CREATE TABLE media_tag (
	id UUID NOT NULL,
	media_id UUID NOT NULL,
	tag_id UUID NOT NULL,
	tagged_by VARCHAR(100),
	tagged_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	notes TEXT,
	CONSTRAINT pk_media_tag PRIMARY KEY (id),
	CONSTRAINT fk_media_tag_media_id_media_asset FOREIGN KEY(media_id) REFERENCES media_asset (id),
	CONSTRAINT fk_media_tag_tag_id_tag FOREIGN KEY(tag_id) REFERENCES tag (id),
	CONSTRAINT uq_media_tag_media_id UNIQUE (media_id, tag_id)
)

;


CREATE TABLE species_annotation (
	id UUID NOT NULL,
	media_id UUID NOT NULL,
	species_id UUID NOT NULL,
	annotated_by VARCHAR(100),
	review_status VARCHAR(20) DEFAULT 'unreviewed' NOT NULL,
	reviewed_by VARCHAR(100),
	annotation_import_id UUID NOT NULL,
	imported_at TIMESTAMP WITH TIME ZONE NOT NULL,
	CONSTRAINT pk_species_annotation PRIMARY KEY (id),
	CONSTRAINT fk_species_annotation_media_id_media_asset FOREIGN KEY(media_id) REFERENCES media_asset (id),
	CONSTRAINT fk_species_annotation_species_id_species FOREIGN KEY(species_id) REFERENCES species (id),
	CONSTRAINT fk_species_annotation_annotation_import_id_annotation_import FOREIGN KEY(annotation_import_id) REFERENCES annotation_import (id),
	CONSTRAINT uq_species_annotation_media_id UNIQUE (media_id, species_id),
	CHECK (review_status IN ('unreviewed','reviewed'))
)

;

CREATE INDEX ix_species_annotation_species_id_media_id ON species_annotation (species_id, media_id);

ALTER TABLE individual ADD CONSTRAINT fk_individual_own_profile FOREIGN KEY(id, profile_id) REFERENCES individual_profile (individual_id, id);

CREATE INDEX ix_camera_site_geom ON camera_site USING gist (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) WHERE longitude IS NOT NULL;

INSERT INTO tag (id, tag_code, tag_name, tag_type) VALUES ('00000000-0000-0000-0000-000000000001', 'unknown_individual', '未知个体', 'individual');
