-- Migration: Add property approval and boundary columns
-- Description: เพิ่ม columns สำหรับระบบอนุมัติการ์ดและเก็บเส้นกรอบที่ดิน

-- 1. เพิ่ม columns ในตาราง properties
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS boundary_coordinates JSONB,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- 2. เพิ่ม column status ในตาราง property_details
ALTER TABLE property_details
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- 3. เพิ่ม column metadata ในตาราง notifications (optional - สำหรับเก็บข้อมูลเพิ่มเติม)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 4. สร้าง index สำหรับการ query ที่เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_approved_by ON properties(approved_by);
CREATE INDEX IF NOT EXISTS idx_property_details_status ON property_details(status);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(role);

-- 5. อัปเดต properties ที่มีอยู่แล้วให้เป็น status = 'approved' (ถ้าต้องการ)
-- UNCOMMENT บรรทัดนี้ถ้าต้องการให้การ์ดที่มีอยู่แล้วแสดงทันที
-- UPDATE properties SET status = 'approved' WHERE status IS NULL;
-- UPDATE property_details SET status = 'approved' WHERE status IS NULL;

-- 6. เพิ่ม comment สำหรับ documentation
COMMENT ON COLUMN properties.boundary_coordinates IS 'GeoJSON MultiPolygon format สำหรับเก็บเส้นกรอบที่ดิน';
COMMENT ON COLUMN properties.status IS 'สถานะการ์ด: pending (รออนุมัติ), approved (อนุมัติแล้ว), rejected (ปฏิเสธ)';
COMMENT ON COLUMN properties.approved_by IS 'ID ของ admin ที่อนุมัติการ์ด';
COMMENT ON COLUMN properties.approved_at IS 'เวลาที่อนุมัติการ์ด';
COMMENT ON COLUMN property_details.status IS 'สถานะรายละเอียดการ์ด: pending, approved, rejected';
COMMENT ON COLUMN notifications.metadata IS 'ข้อมูลเพิ่มเติมสำหรับ notification (เช่น property_id, property_name)';

