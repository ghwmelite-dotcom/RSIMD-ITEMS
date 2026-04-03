-- Migration 001: Add OS and processor fields to equipment
ALTER TABLE equipment ADD COLUMN os_version TEXT;
ALTER TABLE equipment ADD COLUMN processor_gen TEXT;
