export type CurrencyCode = 'AED' | 'BHD';

export class Money {
  private constructor(
    public readonly amountMinor: number,
    public readonly currency: CurrencyCode
  ) {}

  public static fromMajor(amountMajor: number, currency: CurrencyCode): Money {
    const factor = currency === 'BHD' ? 1000 : 100;
    return new Money(Math.round(amountMajor * factor), currency);
  }

  public static fromMinor(amountMinor: number, currency: CurrencyCode): Money {
    return new Money(Math.round(amountMinor), currency);
  }

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }

  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor - other.amountMinor, this.currency);
  }

  public multiply(factor: number): Money {
    return new Money(Math.round(this.amountMinor * factor), this.currency);
  }

  public isNegative(): boolean {
    return this.amountMinor < 0;
  }

  public isPositive(): boolean {
    return this.amountMinor > 0;
  }

  public isZero(): boolean {
    return this.amountMinor === 0;
  }

  public isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor < other.amountMinor;
  }

  public isGreaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor >= other.amountMinor;
  }

  public format(): string {
    const factor = this.currency === 'BHD' ? 1000 : 100;
    const decimals = this.currency === 'BHD' ? 3 : 2;
    return `${(this.amountMinor / factor).toFixed(decimals)} ${this.currency}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: cannot operate on ${this.currency} and ${other.currency}`);
    }
  }
}