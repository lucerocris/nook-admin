CREATE OR REPLACE FUNCTION check_crawl_tier_completion(
  p_user_id uuid,
  p_crawl_id uuid
) RETURNS uuid AS $$
DECLARE
  v_highest_tier_id uuid;
  v_user_tiers text[];
BEGIN
  SELECT array_agg(DISTINCT cst.tier)
  INTO v_user_tiers
  FROM crawl_stamps cs
  JOIN crawl_stops cst ON cs.stop_id = cst.id
  WHERE cs.crawl_id = p_crawl_id
    AND cs.user_id = p_user_id
    AND cs.is_verified = true;

  SELECT ct.id INTO v_highest_tier_id
  FROM crawl_tiers ct
  WHERE ct.crawl_id = p_crawl_id
    AND ct.required_tier_tags <@ COALESCE(v_user_tiers, ARRAY[]::text[])
  ORDER BY ct.tier_order DESC
  LIMIT 1;

  RETURN v_highest_tier_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
