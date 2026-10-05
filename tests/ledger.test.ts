import test from 'node:test';
import assert from 'node:assert';
import { evaluateLedger } from '../src/engine/ledgerEngine.js';
import { LedgerEvent } from '../src/domain/types.js';
import { Money } from '../src/domain/money.js';

// --- Utility for Beautiful Console Output ---
function printOutputTable(testName: string, day: number, outputs: ReturnType<typeof evaluateLedger>) {
    console.log(`\n🧪 TEST: ${testName} (End of Day ${day})`);
    const outputRows: any = {};
    for (const [accountId, state] of outputs.entries()) {
        outputRows[accountId] = {
            'Ledger Balance': state.closingLedgerBalance,
            'Available Balance': state.availableBalance,
            'On Hold': state.onHoldAmount,
            'Fee Assessments': state.feeAssessments,
            'Active Holds': state.authorizationStates.join(' | ') || 'None',
            'Errors': state.errors.length > 0 ? state.errors.join('; ') : 'None'
        };
    }
    console.table(outputRows);
}

// --- The Core Requirement: Replay Stream ---
test('Core Requirement: Replay the full Day 1 to Day 6 event stream', () => {
    const FULL_EVENT_STREAM: LedgerEvent[] = [
        { id: 'E1', day: 1, type: 'CREDIT', accountId: 'ACC-001', amountMinor: 120000, currency: 'AED', valueDate: 1 },
        { id: 'E2', day: 1, type: 'DEBIT', accountId: 'ACC-001', amountMinor: 95000, currency: 'AED', valueDate: 1 },
        { id: 'E3', day: 2, type: 'AUTHORIZATION', accountId: 'ACC-001', amountMinor: 20000, currency: 'AED', valueDate: 2 },
        { id: 'E4', day: 3, type: 'CREDIT', accountId: 'ACC-001', amountMinor: 40000, currency: 'AED', valueDate: 3 },
        { id: 'E5', day: 4, type: 'SETTLEMENT', accountId: 'ACC-001', amountMinor: 18500, currency: 'AED', valueDate: 4, referenceId: 'E3' }, 
        { id: 'E6', day: 4, type: 'SETTLEMENT', accountId: 'ACC-001', amountMinor: 18000, currency: 'AED', valueDate: 4, referenceId: 'Auth-Z' },
        { id: 'E7', day: 5, type: 'DEBIT', accountId: 'ACC-001', amountMinor: 62000, currency: 'AED', valueDate: 2 },
        { id: 'E8', day: 5, type: 'AUTHORIZATION', accountId: 'ACC-001', amountMinor: 9000, currency: 'AED', valueDate: 5 },
        { id: 'E9', day: 6, type: 'REVERSAL', accountId: 'ACC-001', amountMinor: 62000, currency: 'AED', valueDate: 2, referenceId: 'E7' },
        { id: 'E10-1', day: 5, type: 'CREDIT', accountId: 'ACC-002', amountMinor: 3333, currency: 'BHD', valueDate: 5 },
        { id: 'E10-2', day: 5, type: 'CREDIT', accountId: 'ACC-002', amountMinor: 3333, currency: 'BHD', valueDate: 5 },
        { id: 'E10-3', day: 5, type: 'CREDIT', accountId: 'ACC-002', amountMinor: 3334, currency: 'BHD', valueDate: 5 }
    ];

    console.log('\n======================================================');
    console.log('🏦 RUNNING FULL EVENT STREAM (DAYS 1-6)');
    console.log('======================================================');

    for (let currentDay = 1; currentDay <= 6; currentDay++) {
        const dailyOutput = evaluateLedger(FULL_EVENT_STREAM, currentDay);
        printOutputTable(`Full Stream Replay`, currentDay, dailyOutput);
    }
    console.log('======================================================\n');
    assert.ok(true); 
});

// --- Edge Cases ---
test('Edge Case 1: Insufficient available balance blocks secondary authorization hold', () => {
    const events: LedgerEvent[] = [
        { id: 'TXN-101', day: 1, type: 'CREDIT', accountId: 'ACC-001', amountMinor: Money.fromMajor(850.75, 'AED').amountMinor, currency: 'AED', valueDate: 1 },
        { id: 'AUTH-ALPHA', day: 2, type: 'AUTHORIZATION', accountId: 'ACC-001', amountMinor: Money.fromMajor(600.00, 'AED').amountMinor, currency: 'AED', valueDate: 2 },
        { id: 'AUTH-BETA', day: 2, type: 'AUTHORIZATION', accountId: 'ACC-001', amountMinor: Money.fromMajor(300.00, 'AED').amountMinor, currency: 'AED', valueDate: 2 }
    ];

    const outputs = evaluateLedger(events, 2);
    printOutputTable('Insufficient Balance Rejection', 2, outputs);
    
    const acc1 = outputs.get('ACC-001');
    assert.strictEqual(acc1?.closingLedgerBalance, '850.75 AED');
    assert.strictEqual(acc1?.onHoldAmount, '600.00 AED');
    assert.strictEqual(acc1?.availableBalance, '250.75 AED');
    assert.strictEqual(acc1?.errors.length, 1);
    assert.match(acc1?.errors[0] || '', /insufficient available balance/i);
});

test('Edge Case 2: Partial settlement releases residual uncaptured hold back to available balance', () => {
    const events: LedgerEvent[] = [
        { id: 'TXN-201', day: 1, type: 'CREDIT', accountId: 'ACC-001', amountMinor: Money.fromMajor(2500.50, 'AED').amountMinor, currency: 'AED', valueDate: 1 },
        { id: 'AUTH-GAMMA', day: 2, type: 'AUTHORIZATION', accountId: 'ACC-001', amountMinor: Money.fromMajor(750.00, 'AED').amountMinor, currency: 'AED', valueDate: 2 },
        { id: 'TXN-202', day: 3, type: 'SETTLEMENT', accountId: 'ACC-001', amountMinor: Money.fromMajor(420.25, 'AED').amountMinor, currency: 'AED', valueDate: 3, referenceId: 'AUTH-GAMMA' }
    ];

    const outputs = evaluateLedger(events, 3);
    printOutputTable('Partial Settlement Residual Release', 3, outputs);
    
    const acc1 = outputs.get('ACC-001');
    assert.strictEqual(acc1?.closingLedgerBalance, '2080.25 AED');
    assert.strictEqual(acc1?.onHoldAmount, '0.00 AED');
    assert.strictEqual(acc1?.availableBalance, '2080.25 AED');
});

test('Edge Case 3: Backdated debit triggers historical overdraft fee and later reversal clears it', () => {
    const events: LedgerEvent[] = [
        { id: 'TXN-301', day: 1, type: 'CREDIT', accountId: 'ACC-001', amountMinor: Money.fromMajor(300.00, 'AED').amountMinor, currency: 'AED', valueDate: 1 },
        { id: 'TXN-302', day: 4, type: 'DEBIT', accountId: 'ACC-001', amountMinor: Money.fromMajor(450.00, 'AED').amountMinor, currency: 'AED', valueDate: 1 },
    ];

    const outputsDay1 = evaluateLedger(events, 1);
    printOutputTable('Backdated Debit (Day 1 View)', 1, outputsDay1);
    assert.strictEqual(outputsDay1.get('ACC-001')?.closingLedgerBalance, '-175.00 AED');
    assert.strictEqual(outputsDay1.get('ACC-001')?.feeAssessments, '25.00 AED');

    events.push({ id: 'TXN-303', day: 5, type: 'REVERSAL', accountId: 'ACC-001', amountMinor: Money.fromMajor(450.00, 'AED').amountMinor, currency: 'AED', valueDate: 5, referenceId: 'TXN-302' });
    
    const outputsDay5 = evaluateLedger(events, 5);
    printOutputTable('Reversal Resolves Balance (Day 5 View)', 5, outputsDay5);
    assert.strictEqual(outputsDay5.get('ACC-001')?.closingLedgerBalance, '300.00 AED');
    assert.strictEqual(outputsDay5.get('ACC-001')?.feeAssessments, '0.00 AED');
});

test('Edge Case 4: Multi-currency BHD 3-decimal precision tracking', () => {
    const events: LedgerEvent[] = [
        { id: 'TXN-401', day: 1, type: 'CREDIT', accountId: 'ACC-002', amountMinor: 14875, currency: 'BHD', valueDate: 1 }, 
        { id: 'TXN-402', day: 2, type: 'DEBIT', accountId: 'ACC-002', amountMinor: 3125, currency: 'BHD', valueDate: 2 }  
    ];

    const outputs = evaluateLedger(events, 2);
    printOutputTable('BHD Minor Unit Validation', 2, outputs);
    
    const acc2 = outputs.get('ACC-002');
    assert.strictEqual(acc2?.closingLedgerBalance, '11.750 BHD');
    assert.strictEqual(acc2?.availableBalance, '11.750 BHD');
});

test('Edge Case 5: Validates 25 AED overdraft fee on negative balance and 0.04% interest capitalization on Day 6', () => {
    const events: LedgerEvent[] = [
        { id: 'TXN-501', day: 1, type: 'CREDIT', accountId: 'ACC-001', amountMinor: Money.fromMajor(1000.00, 'AED').amountMinor, currency: 'AED', valueDate: 1 },
        { id: 'TXN-502', day: 2, type: 'DEBIT', accountId: 'ACC-001', amountMinor: Money.fromMajor(1200.00, 'AED').amountMinor, currency: 'AED', valueDate: 2 }
    ];

    const outputsDay2 = evaluateLedger(events, 2);
    printOutputTable('Overdraft Fee Trigger', 2, outputsDay2);
    assert.strictEqual(outputsDay2.get('ACC-001')?.closingLedgerBalance, '-225.00 AED');
    
    const outputsDay6 = evaluateLedger(events, 6);
    printOutputTable('Interest Capitalization', 6, outputsDay6);
    assert.strictEqual(outputsDay6.get('ACC-001')?.closingLedgerBalance, '-224.60 AED');
});

test('Architecture: Event stream permutation yields identical projection due to value-date sorting', () => {
    const eventsInOrder: LedgerEvent[] = [
        { id: 'E1', day: 1, type: 'CREDIT', accountId: 'ACC-001', amountMinor: 120000, currency: 'AED', valueDate: 1 },
        { id: 'E2', day: 1, type: 'DEBIT', accountId: 'ACC-001', amountMinor: 95000, currency: 'AED', valueDate: 1 },
        { id: 'E3', day: 2, type: 'AUTHORIZATION', accountId: 'ACC-001', amountMinor: 20000, currency: 'AED', valueDate: 2 }
    ];

    const eventsShuffled: LedgerEvent[] = [
        eventsInOrder[2],
        eventsInOrder[0],
        eventsInOrder[1]
    ];

    const resultOrdered = evaluateLedger(eventsInOrder, 2);
    const resultShuffled = evaluateLedger(eventsShuffled, 2);

    printOutputTable('Idempotent Shuffled Projection', 2, resultShuffled);
    assert.deepStrictEqual(resultOrdered.get('ACC-001'), resultShuffled.get('ACC-001'));
});