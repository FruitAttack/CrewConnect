/**
 * Forms and Form Submissions Database Schema
 * SQL CREATE TABLE commands for Supabase/PostgreSQL
 */

-- Forms table
-- Stores form templates/schemas
CREATE TABLE IF NOT EXISTS app.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES app.companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'General',
  icon VARCHAR(10),
  
  -- Association settings for each entity type
  -- Each association has an enabled flag and optional question text
  project_enabled BOOLEAN DEFAULT false,
  project_question VARCHAR(255),
  
  equipment_enabled BOOLEAN DEFAULT false,
  equipment_question VARCHAR(255),
  
  user_enabled BOOLEAN DEFAULT false,
  user_question VARCHAR(255),
  

  cost_code_enabled BOOLEAN DEFAULT false,
  cost_code_question VARCHAR(255),
  
  -- JSON storage for field definitions
  fields JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_by UUID REFERENCES app.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  archived BOOLEAN DEFAULT false,
  
  CONSTRAINT title_not_empty CHECK (title != '')
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_forms_company_id ON app.forms(company_id);
CREATE INDEX IF NOT EXISTS idx_forms_category ON app.forms(category);
CREATE INDEX IF NOT EXISTS idx_forms_created_at ON app.forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forms_archived ON app.forms(archived);


-- Form Submissions table
-- Stores individual form submissions and responses
CREATE TABLE IF NOT EXISTS app.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES app.companies(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES app.forms(id) ON DELETE CASCADE,
  
  -- Field responses stored as JSON
  -- Structure: { "field_id": value, "field_id": value, ... }
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Submission metadata
  submitted_by UUID NOT NULL REFERENCES app.users(id),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Associated entities (optional)
  -- Links submission to related objects in the system
  associated_project_id UUID REFERENCES app.projects(id),
  associated_equipment_id UUID REFERENCES app.equipment(id),
  associated_user_id UUID REFERENCES app.users(id),
  associated_customer_id UUID REFERENCES app.customers(id),
  associated_cost_code_id UUID REFERENCES app.cost_codes(id),
  
  -- Audit fields
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by UUID REFERENCES app.users(id),
  
  CONSTRAINT form_id_not_null CHECK (form_id IS NOT NULL)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_form_submissions_company_id ON app.form_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON app.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_by ON app.form_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON app.form_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_associated_project ON app.form_submissions(associated_project_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_associated_equipment ON app.form_submissions(associated_equipment_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_associated_user ON app.form_submissions(associated_user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_associated_customer ON app.form_submissions(associated_customer_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_associated_cost_code ON app.form_submissions(associated_cost_code_id);

-- Composite index for common queries (form + date range)
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_date ON app.form_submissions(form_id, submitted_at DESC);


-- Optional: Audit trigger to automatically update updated_at
-- Uncomment if using this pattern across your database
/*
CREATE OR REPLACE FUNCTION update_form_submission_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER form_submission_update_timestamp
BEFORE UPDATE ON form_submissions
FOR EACH ROW
WHEN (OLD IS DISTINCT FROM NEW)
EXECUTE FUNCTION update_form_submission_timestamp();
*/


-- Optional: Enable Row Level Security (RLS) for multi-tenancy
-- Uncomment to enforce company-based access control
/*
ALTER TABLE app.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY forms_company_isolation ON app.forms
  USING (company_id = auth.jwt() ->> 'company_id'::uuid);

CREATE POLICY form_submissions_company_isolation ON app.form_submissions
  USING (company_id = auth.jwt() ->> 'company_id'::uuid);
*/
