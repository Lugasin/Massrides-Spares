-- Super Admin Financial Summary View
-- efficient aggregation for dashboard

CREATE OR REPLACE VIEW public.super_admin_financial_summary AS
SELECT 
  -- Revenue
  (SELECT COALESCE(SUM(commission_amount), 0) FROM platform_commissions WHERE status = 'recorded') as total_commission_recorded,
  (SELECT COALESCE(SUM(commission_amount), 0) FROM platform_commissions WHERE status = 'pending') as total_commission_pending,
  
  -- Volume
  (SELECT COALESCE(SUM(total_amount), 0) FROM escrow_releases WHERE status = 'completed') as total_volume_released,
  (SELECT COUNT(*) FROM escrow_releases WHERE status = 'pending') as pending_escrow_releases,
  
  -- Payouts
  (SELECT COUNT(*) FROM vendor_payouts WHERE status = 'pending') as pending_payouts,
  (SELECT COUNT(*) FROM vendor_payouts WHERE status = 'processing') as processing_payouts,
  (SELECT COUNT(*) FROM vendor_payouts WHERE status = 'failed') as failed_payouts,
  (SELECT COALESCE(SUM(amount), 0) FROM vendor_payouts WHERE status = 'completed') as total_payouts_completed;

-- Grant access
GRANT SELECT ON public.super_admin_financial_summary TO authenticated;
