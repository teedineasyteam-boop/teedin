-- Function to update property status based on payments
CREATE OR REPLACE FUNCTION update_property_promotion_status()
RETURNS TRIGGER AS $$
DECLARE
  target_property_id UUID;
  has_active_payment BOOLEAN;
BEGIN
  -- Determine the property_id involved
  IF (TG_OP = 'DELETE') THEN
    target_property_id := OLD.property_id;
  ELSE
    target_property_id := NEW.property_id;
  END IF;

  -- Check if there are any successful payments for this property
  SELECT EXISTS (
    SELECT 1 FROM property_payments
    WHERE property_id = target_property_id
    AND status = 'successful'
  ) INTO has_active_payment;

  -- Update the property's is_promoted flag
  UPDATE properties
  SET is_promoted = has_active_payment
  WHERE id = target_property_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS sync_property_promotion ON property_payments;
CREATE TRIGGER sync_property_promotion
AFTER INSERT OR UPDATE OR DELETE ON property_payments
FOR EACH ROW
EXECUTE FUNCTION update_property_promotion_status();
