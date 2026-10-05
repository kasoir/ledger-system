# Ledger Engine Prototype

## Overview
This is a purely functional, in-memory Event Sourced ledger projection engine. It utilizes strict Domain-Driven Design (DDD) principles, specifically relying on immutable Value Objects (`Money`) to eliminate floating-point drift and ensure pass-by-reference safety.

## How to Run
1. Install dependencies: `npm install`
2. Execute the native test suite: `npm test`
3. Run the engine against the sample event stream: `npm run start`

## How to Read the Output
The engine returns a `Map<string, DailyOutput>` keyed by Account ID. 
Each `DailyOutput` contains:
- `closingLedgerBalance`: The absolute settled funds (e.g., "150.00 AED").
- `availableBalance`: The purchasing power (Ledger Balance minus `onHoldAmount`).
- `onHoldAmount`: Total value of active authorizations.
- `feeAssessments`: Overdraft penalties applied on that specific day.
- `authorizationStates`: An array of active hold IDs and their amounts.
- `errors`: A string array of domain rejections (e.g., insufficient funds).