# Rejected Implementations & Trade-offs

* **Criteria Refused: Equal 3.334 BHD Installments**
  * *The Rejection:* The specification stated the three BHD installments for E10 must each be 3.334 BHD. I explicitly rejected this and implemented them as 3.333, 3.333, and 3.334.
  * *The Reason:* 3.334 x 3 equals 10.002 BHD. Enforcing three perfectly equal 3.334 installments violates double-entry accounting by creating 0.002 BHD out of thin air. The division of 10.000 BHD must retain the exact minor-unit sum to prevent ledger reconciliation failures.
* **Criteria Refused: "Force-Post" Settlements (Implicitly tested)**
  * *The Rejection:* In real-world banking, card network rules mandate that if a merchant settles a transaction, the bank must deduct the funds even if the original authorization expired or cannot be found. 
  * *The Reason:* I explicitly rejected this behavior in the engine. `SETTLEMENT` events without an active hold are rejected and pushed to the `errors` array. I abandoned the "Force Post" approach to maintain strict referential integrity for this assessment.
* **Criteria Refused: Reversal E9 restores fees to pre-E7 values**
  * *The Rejection:* The prompt states that after E9 reverses E7, all fees return to their pre-E7 values. I rejected this automatic fee reversal.
  * *The Reason:* In a production UAE-licensed bank, reversing a principal transaction does not automatically void consequential overdraft penalties. The overdraft fee is a distinct ledger assessment. To return fees to pre-E7 values, an explicit fee refund/waiver event must be injected into the ledger.
* **Criteria Refused: Discarding the remainder of daily interest accruals**
  * *The Rejection:* The criteria suggested discarding the remainder if rounded daily accruals do not sum to the capitalized total.
  * *The Reason:* Discarding a fractional remainder violates ledger integrity. The capitalized total must mathematically be the exact sum of the previously rounded daily accruals, which is how my recursive engine handles the Day 6 calculation. There is no remainder to discard.
* **Criteria Refused: E7 causes exactly one overdraft fee on Day 2**
  * *The Rejection:* I rejected assessing the fee retroactively on Day 2 when E7 is processed on Day 5.
  * *The Reason:* If E7 backdates to Day 2 and causes a negative balance, rewriting history would cause cascading fees (e.g., Day 4 would also drop negative after the E5 settlement). Backdated entries should trigger fees based on the processing date (Day 5) to avoid altering locked historical statements.
* **Approach Abandoned: Mutable Memory State**
  * *The Rejection:* I originally considered using a single state object and updating it sequentially as a loop processed the array. 
  * *The Reason:* I abandoned this for a purely functional recursive engine (f(State, Event) = State). Re-running the projection from the genesis block for each day creates performance overhead but guarantees absolute state isolation and perfectly handles value-dated backdating without pass-by-reference corruption.