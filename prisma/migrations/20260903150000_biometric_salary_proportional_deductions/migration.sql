-- Salary deductions are now computed purely from each employee's own
-- monthly salary (salaire/26 per absent day, that/8 per hour late) rather
-- than a global fixed-DH config + tiered lateness table. Both tables held
-- only that now-obsolete configuration, nothing referenced by anything
-- else — safe to drop outright.
DROP TABLE "biometric_late_penalty_rules";
DROP TABLE "biometric_payroll_config";
