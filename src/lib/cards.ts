import type { Item } from './types';

/**
 * Credit card extended warranty. Many cards add a year to the maker's warranty when the whole
 * purchase goes on the card. Terms differ by card and change, so each option says what's typical
 * and the app tells people to confirm in their card's benefits guide. (Sources: 2026 issuer and
 * comparison pages; Visa Signature/Infinite: +1 yr on warranties of 3 yrs or less; American
 * Express cards with an annual fee: +1 yr on warranties of 5 yrs or less.)
 */
export type CardBenefit = { id: string; label: string; note: string; extraMonths: number; maxOriginalMonths: number };

export const CARDS: CardBenefit[] = [
  {
    id: 'visa-signature',
    label: 'Visa Signature or Infinite',
    note: 'Includes most Chase cards. Usually +1 year on warranties of 3 years or less.',
    extraMonths: 12,
    maxOriginalMonths: 36,
  },
  {
    id: 'amex',
    label: 'American Express',
    note: 'Most cards with an annual fee. Usually +1 year on warranties of 5 years or less.',
    extraMonths: 12,
    maxOriginalMonths: 60,
  },
  {
    id: 'other',
    label: 'Another card with warranty cover',
    note: 'Many premium cards add a year. Check your card’s benefits guide.',
    extraMonths: 12,
    maxOriginalMonths: 36,
  },
];

export function cardInfo(id: string | null | undefined): CardBenefit | null {
  return CARDS.find((c) => c.id === id) ?? null;
}

/** Extra months the card adds, if it applies: needs a maker's warranty within the card's limit. */
export function cardExtension(item: Pick<Item, 'warrantyMonths'> & { paidWith?: string | null }): number {
  const card = cardInfo(item.paidWith);
  if (!card || !item.warrantyMonths || item.warrantyMonths > card.maxOriginalMonths) return 0;
  return card.extraMonths;
}
