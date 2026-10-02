ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS installments_paid integer DEFAULT 0;
