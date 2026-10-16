export interface DeletionAlert {
  is_standby: boolean;
  scheduled_delete_at?: string;
  days_remaining: number;
  message?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'accountant' | 'viewer';
  is_active: boolean;
  scheduled_delete_at?: string;
  deletion_status?: string;
  deletion_alert?: DeletionAlert;
  last_login?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface Merchant {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  gstin?: string;
  current_balance: number;
  created_at: string;
}

export interface ItemVariant {
  id: string;
  item_id: string;
  size: string;
  rate: number;
  image_url?: string;
  created_at: string;
}

export interface Item {
  id: string;
  name: string;
  category?: string;
  unit: 'chauka' | 'jod' | 'piece' | 'meter';
  image_url?: string;
  description?: string;
  variants: ItemVariant[];
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  item_id: string;
  item_name: string;
  variant_id: string;
  variant_size: string;
  unit: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_no: string;
  merchant_id: string;
  merchant_name: string;
  merchant_phone?: string;
  merchant_gstin?: string;
  invoice_date: string;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  total_amount: number;
  status: 'active' | 'cancelled';
  cancelled_at?: string;
  cancel_reason?: string;
  created_at: string;
  items?: InvoiceItem[];
}

export interface Payment {
  id: string;
  merchant_id: string;
  merchant_name: string;
  merchant_phone?: string;
  amount: number;
  payment_mode: 'cash' | 'bank' | 'upi';
  payment_date: string;
  created_at: string;
}

export interface LedgerItem {
  id: string;
  merchant_id: string;
  transaction_type: 'invoice' | 'payment' | 'adjustment' | 'invoice_cancel';
  reference_id: string;
  reference_text: string;
  debit: number;
  credit: number;
  balance: number;
  entry_date: string;
  created_at: string;
}

export interface MerchantLedger {
  merchant_id: string;
  merchant_name: string;
  merchant_phone?: string;
  merchant_gstin?: string;
  current_balance: number;
  entries: LedgerItem[];
}

export interface TopMerchant {
  merchant_id: string;
  merchant_name: string;
  merchant_phone?: string;
  total_sales: number;
  current_balance: number;
}

export interface RecentInvoice {
  id: string;
  invoice_no: string;
  merchant_name: string;
  invoice_date: string;
  total_amount: number;
  status: string;
}

export interface RecentPayment {
  id: string;
  merchant_name: string;
  payment_date: string;
  payment_mode: string;
  amount: number;
}

export interface DashboardMetrics {
  monthly_sales: number;
  monthly_taxable: number;
  monthly_tax: number;
  monthly_income: number;
  total_outstanding: number;
  total_advance: number;
  active_invoices_count: number;
  merchants_count: number;
  top_merchants: TopMerchant[];
  recent_invoices: RecentInvoice[];
  recent_payments: RecentPayment[];
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  module: string;
  record_id?: string;
  old_data?: any;
  new_data?: any;
  ip_address?: string;
  created_at: string;
}

export interface Backup {
  id: string;
  filename: string;
  size_bytes: number;
  status: string;
  created_at: string;
}
