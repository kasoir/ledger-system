# Constants & Magic Numbers Justification

* **100 and 1000 (Currency Multipliers):** AED has 2 decimal places (fils), BHD has 3. I strictly used these multipliers inside the `Money` Value Object to store all balances as integers. Why not 10 or 10,000? Because utilizing the exact minor-unit multiplier completely eliminates IEEE 754 floating-point drift in JavaScript without needing heavy external dependencies.
* **0.0004 (Interest Rate):** Represents the 0.04% daily interest rate specified by the business rules for Day 6 accrual. 
* **25.00 (Overdraft Fee):** Hardcoded specifically for AED accounts when the ledger balance drops below zero at end-of-day.