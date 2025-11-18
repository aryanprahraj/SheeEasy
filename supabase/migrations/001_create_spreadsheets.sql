-- Create spreadsheets table
CREATE TABLE IF NOT EXISTS spreadsheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sheet_data JSONB NOT NULL DEFAULT '{"sheets": [{"id": "sheet1", "name": "Sheet 1", "data": {"cells": {}, "rows": 100, "columns": 26, "mergedCells": [], "rowHeights": {}, "columnWidths": {}}}], "activeSheetId": "sheet1"}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE spreadsheets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own spreadsheets"
    ON spreadsheets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own spreadsheets"
    ON spreadsheets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spreadsheets"
    ON spreadsheets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spreadsheets"
    ON spreadsheets FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS spreadsheets_user_id_idx ON spreadsheets(user_id);
CREATE INDEX IF NOT EXISTS spreadsheets_created_at_idx ON spreadsheets(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_spreadsheets_updated_at
    BEFORE UPDATE ON spreadsheets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
