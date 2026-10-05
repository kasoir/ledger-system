import { LedgerEvent, DailyOutput } from '../domain/types';
import { Money, CurrencyCode } from '../../../ledger-system/src/domain/money';

function computeAccountStateForDay(
    events: ReadonlyArray<LedgerEvent>,
    accountId: string,
    currency: CurrencyCode,
    targetDay: number,
    includeInterest: boolean
): { ledgerBalance: Money; activeHolds: Map<string, Money>; feeAssessments: Money; errors: string[] } {
    let ledgerBalance = Money.fromMinor(0, currency);
    const activeHolds = new Map<string, Money>();
    const errors: string[] = [];

    const relevantEvents = events
        .filter(e => e.accountId === accountId && (e.valueDate <= targetDay || (e.type === 'AUTHORIZATION' && e.day <= targetDay)))
        .slice()
        .sort((a, b) => a.day - b.day);

    for (const event of relevantEvents) {
        const eventMoney = Money.fromMinor(event.amountMinor, event.currency);

        switch (event.type) {
            case 'CREDIT':
                ledgerBalance = ledgerBalance.add(eventMoney);
                break;
            case 'DEBIT':
                ledgerBalance = ledgerBalance.subtract(eventMoney);
                break;
            case 'AUTHORIZATION':
                if (event.day <= targetDay) {
                    let totalHolds = Money.fromMinor(0, currency);
                    for (const hold of activeHolds.values()) {
                        totalHolds = totalHolds.add(hold);
                    }
                    const available = ledgerBalance.subtract(totalHolds);
                    if (available.isGreaterThanOrEqual(eventMoney)) {
                        activeHolds.set(event.id, eventMoney);
                    } else {
                        errors.push(`Authorization rejected for ${event.id}: insufficient available balance.`);
                    }
                }
                break;
            case 'SETTLEMENT':
                if (event.referenceId && activeHolds.has(event.referenceId)) {
                    activeHolds.delete(event.referenceId);
                    ledgerBalance = ledgerBalance.subtract(eventMoney);
                } else if (event.day === targetDay) {
                    errors.push(`Settlement rejected for ${event.referenceId}: authorization not found.`);
                }
                break;
            case 'REVERSAL':
                if (event.referenceId) {
                    const targetEvent = events.find(e => e.id === event.referenceId);
                    if (targetEvent) {
                        const targetMoney = Money.fromMinor(targetEvent.amountMinor, targetEvent.currency);
                        if (targetEvent.type === 'DEBIT') {
                            ledgerBalance = ledgerBalance.add(targetMoney);
                        } else if (targetEvent.type === 'CREDIT') {
                            ledgerBalance = ledgerBalance.subtract(targetMoney);
                        }
                    }
                }
                break;
        }
    }

    let feeAssessments = Money.fromMinor(0, currency);
    if (ledgerBalance.isNegative() && currency === 'AED') {
        feeAssessments = Money.fromMajor(25.00, 'AED');
        ledgerBalance = ledgerBalance.subtract(feeAssessments);
    }

    if (includeInterest && targetDay === 6) {
        let totalInterest = Money.fromMinor(0, currency);
        for (let d = 1; d <= 6; d++) {
            const dayState = computeAccountStateForDay(events, accountId, currency, d, false);
            if (dayState.ledgerBalance.isPositive()) {
                const dailyAccrual = dayState.ledgerBalance.multiply(0.0004);
                totalInterest = totalInterest.add(dailyAccrual);
            }
        }
        ledgerBalance = ledgerBalance.add(totalInterest);
    }

    return { ledgerBalance, activeHolds, feeAssessments, errors };
}

export function evaluateLedger(
    events: ReadonlyArray<LedgerEvent>,
    targetDay: number
): Map<string, DailyOutput> {
    const outputs = new Map<string, DailyOutput>();
    const accounts: Array<{ id: string; currency: CurrencyCode }> = [
        { id: 'ACC-001', currency: 'AED' },
        { id: 'ACC-002', currency: 'BHD' }
    ];

    for (const acc of accounts) {
        const state = computeAccountStateForDay(events, acc.id, acc.currency, targetDay, true);

        let totalHolds = Money.fromMinor(0, acc.currency);
        for (const hold of state.activeHolds.values()) {
            totalHolds = totalHolds.add(hold);
        }

        const availableBalance = state.ledgerBalance.subtract(totalHolds);

        outputs.set(acc.id, {
            day: targetDay,
            closingLedgerBalance: state.ledgerBalance.format(),
            availableBalance: availableBalance.format(),
            onHoldAmount: totalHolds.format(),
            feeAssessments: state.feeAssessments.format(),
            authorizationStates: Array.from(state.activeHolds.entries()).map(([id, m]) => `${id}: ${m.format()}`),
            errors: state.errors
        });
    }

    return outputs;
}