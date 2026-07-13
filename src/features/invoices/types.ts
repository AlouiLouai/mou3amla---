export interface Invoice {
  id: string;
  refId: string;
  amount: number;
  stampDuty: number;
  total: number;
  date: string;
  counterparty: string;
}
