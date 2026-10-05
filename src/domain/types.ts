import { CurrencyCode } from "./money";

export type EventType = 
  | 'CREDIT' 
  | 'DEBIT' 
  | 'AUTHORIZATION' 
  | 'SETTLEMENT' 
  | 'REVERSAL';

export interface LedgerEvent {
  id: string;
  day: number;
  type: EventType;
  accountId: string;
  amountMinor: number;
  currency: CurrencyCode;
  valueDate: number;
  referenceId?: string;
  description?: string;
}

export interface DailyOutput {
  day: number;
  closingLedgerBalance: string;
  availableBalance: string;
  onHoldAmount: string;
  feeAssessments: string;
  authorizationStates: string[];
  errors: string[];
}