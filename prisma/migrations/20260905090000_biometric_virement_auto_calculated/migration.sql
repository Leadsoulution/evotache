-- Virement is now computed automatically (MIN(salaire, 3050), see
-- computePayroll) instead of a manually-entered fixed amount per employee.
-- Confirmed the 4 existing rows before dropping: one (salary 4000,
-- virement 3050) reproduces identically under the new formula; the other
-- three had virement set with no salary on file at all — under the new
-- formula that now correctly shows "a definir" (no salary = nothing to
-- derive a virement from) rather than a virement floating free of any
-- salary, which was never a coherent state to begin with.
ALTER TABLE "biometric_employee_overrides" DROP COLUMN "monthlyVirement";
