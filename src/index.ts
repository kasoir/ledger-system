import { evaluateLedger } from './engine/ledgerEngine';
import { LedgerEvent } from './domain/types';
import { Money } from './domain/money';

function runLedger() {
  // Define the complete, immutable event stream from Part 1
  // We use Money.fromMajor(...).amountMinor to safely generate minor units
  const events: LedgerEvent[] = [
    {
      id: 'E1', day: 1, type: 'CREDIT', accountId: 'ACC-001',
      amountMinor: Money.fromMajor(1200.00, 'AED').amountMinor, currency: 'AED', valueDate: 1,
      description: 'Initial deposit'
    },
    {
      id: 'E2', day: 1, type: 'DEBIT', accountId: 'ACC-001',
      amountMinor: Money.fromMajor(950.00, 'AED').amountMinor, currency: 'AED', valueDate: 1,
      description: 'Purchase debit'
    },
    {
      id: 'E3', day: 2, type: 'AUTHORIZATION', accountId: 'ACC-001',
      amountMinor: Money.fromMajor(200.00, 'AED').amountMinor, currency: 'AED', valueDate: 2,
      description: 'Auth-A hold'
    },
    {
      id: 'E4', day: 3, type: 'CREDIT', accountId: 'ACC-001',
      amountMinor: Money.fromMajor(400.00, 'AED').amountMinor, currency: 'AED', valueDate: 3,
      description: 'Salary deposit'
    },
    {
      id: 'E5', day: 4, type: 'SETTLEMENT', accountId: 'ACC-001',
      amountMinor: Money.fromMajor(185.00, 'AED').amountMinor, currency: 'AED', valueDate: 4,
      referenceId: 'E3', description: 'Auth-A settlement'
    },
    {
      id: 'E6', day: 4, type: 'SETTLEMENT', accountId: 'ACC-001',
      amountMinor: Money.fromMajor(180.00, 'AED').amountMinor, currency: 'AED', valueDate: 4,
      referenceId: 'Auth-Z', description: 'Auth-Z invalid settlement'
    },
    {
      id: 'E7', day: 5, type: 'DEBIT', accountId: 'ACC-001',
      amountMinor: Money.fromMajor(620.00, 'AED').amountMinor, currency: 'AED', valueDate: 2,
      description: 'Backdated debit'
    },
    {
      id: 'E8', day: 5, type: 'AUTHORIZATION', accountId: 'ACC-001',
      amountMinor: Money.fromMajor(90.00, 'AED').amountMinor, currency: 'AED', valueDate: 5,
      description: 'Auth-B hold'
    },
    {
      id: 'E9', day: 6, type: 'REVERSAL', accountId: 'ACC-001',
      amountMinor: Money.fromMajor(620.00, 'AED').amountMinor, currency: 'AED', valueDate: 2,
      referenceId: 'E7', description: 'Reversal of E7'
    },
    // E10: BHD 10.000 posted as three equal instalments. 
    // We can write minor units directly for BHD (1000 factor) -> 3333, 3333, 3334
    { id: 'E10-1', day: 5, type: 'CREDIT', accountId: 'ACC-002', amountMinor: 3333, currency: 'BHD', valueDate: 5 },
    { id: 'E10-2', day: 5, type: 'CREDIT', accountId: 'ACC-002', amountMinor: 3333, currency: 'BHD', valueDate: 5 },
    { id: 'E10-3', day: 5, type: 'CREDIT', accountId: 'ACC-002', amountMinor: 3334, currency: 'BHD', valueDate: 5 }
  ];

  console.log("=== LEDGER EXECUTION REPORT (DDD ARCHITECTURE) ===");
  for (let day = 1; day <= 6; day++) {
    console.log(`\n--- Day ${day} ---`);
    const dailyOutputs = evaluateLedger(events, day);

    for (const [accountId, output] of dailyOutputs.entries()) {
      console.log(`Account: ${accountId}`);
      console.log(`  Closing Ledger Balance: ${output.closingLedgerBalance}`);
      console.log(`  Available Balance:      ${output.availableBalance}`);
      console.log(`  On-Hold Amount:         ${output.onHoldAmount}`);
      console.log(`  Fee Assessments:        ${output.feeAssessments}`);
      console.log(`  Authorization States:   [ ${output.authorizationStates.join(', ')} ]`);
      if (output.errors.length > 0) {
        console.log(`  Errors:                 [ ${output.errors.join(' | ')} ]`);
      }
    }
  }
}

runLedger();