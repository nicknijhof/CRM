-- The 0004 "admin or owner update discount codes" policy means only
-- admin/owner can update discount_codes rows — but marking a gift code
-- redeemed (purchase-actions.ts addPurchase) runs under whichever role
-- is logged in at the front desk, usually staff. Without a matching
-- update policy that update silently no-ops under RLS, leaving the gift
-- code active and reusable. Mirror the 0016/0018 insert scoping: any
-- authenticated user can update a row that is (and remains) a single-use
-- gift code, same trust level already granted for creating one.

create policy "authenticated update gift discount codes" on discount_codes
  for update to authenticated
  using (single_use = true and is_gift_code = true)
  with check (single_use = true and is_gift_code = true);
