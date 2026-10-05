# Ambiguities & Resolutions

* **Ambiguity 1: The "Residual Hold" Lifecycle (Partial Captures)**
  * *The Problem:* The prompt did not explicitly state what happens to the remainder of an authorization if a settlement is for a lesser amount (e.g., petrol pump pre-auths 500 AED, settles for 120 AED). 
  * *The Resolution:* I resolved this by enforcing that a `SETTLEMENT` unconditionally drops the *entire* referenced `AUTHORIZATION` hold from active memory, instantly releasing the residual 380 AED back to the available balance.
* **Ambiguity 2: Temporal Separation of Holds vs. Settlements**
  * *The Problem:* `valueDate` represents when funds settle, but authorizations affect purchasing power in real-time (`day`).
  * *The Resolution:* I split the temporal filtering in the projection engine. Authorizations filter strictly by real-time `day`, ensuring backdated settlements don't retroactively alter historical real-time available balances. 
* **Ambiguity 3: Overdraft Timing**
  * *The Problem:* If a customer goes into overdraft during the day but deposits funds before midnight, are they charged a fee?
  * *The Resolution:* The fee is evaluated strictly at the end of the day's projection, not at the exact moment of the transaction, acting as an End-Of-Day (EOD) batch sweep.