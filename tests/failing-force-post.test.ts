import test from 'node:test';
import assert from 'node:assert';
import { evaluateLedger } from '../src/engine/ledgerEngine';
import { LedgerEvent } from '../../ledger-system/src/domain/types';      

test('Production Edge Case: The Force-Post Vulnerability', () => {
    const events: LedgerEvent[] = [
        // Customer starts with 100 AED
        { id: 'E1', day: 1, type: 'CREDIT', accountId: 'ACC-001', amountMinor: 10000, currency: 'AED', valueDate: 1 },
        // A settlement arrives for a restaurant tip, but the original hold is missing
        { id: 'E2', day: 2, type: 'SETTLEMENT', accountId: 'ACC-001', amountMinor: 15000, currency: 'AED', valueDate: 2, referenceId: 'AUTH-MISSING' }
    ];

    const output = evaluateLedger(events, 2);
    const accountState = output.get('ACC-001');

    /* 
     * [ANNOTATION]: This test reveals a strictness vs. reality trade-off.
     * The assertion below FAILS because our engine enforces strict referential integrity.
     * It rejects the settlement and leaves the balance at 100 AED.
     * In a live Visa/Mastercard environment, the bank is legally obligated to honor 
     * the settlement. The ledger balance should drop to -50 AED, and trigger the 
     * 25 AED overdraft fee. We deferred this production reality to stay in scope.
     */
    assert.strictEqual(
        accountState?.closingLedgerBalance, 
        '-50.00 AED', 
        'Ledger balance should reflect the force-post deduction'
    );
    
    assert.strictEqual(
        accountState?.errors.length, 
        0, 
        'Should not throw referential integrity errors for network settlements'
    );
});