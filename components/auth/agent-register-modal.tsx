"use client";

import { AgentSuccessModal } from "@/components/auth/agent-success-modal";
import { TermsModal } from "@/components/common/terms-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

interface AgentRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentRegisterModal({
  isOpen,
  onClose,
}: AgentRegisterModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    // ข้อมูลส่วนตัว/ทั่วไป
    profileImage: null as File | null,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    address: "",
    addressMore: "",
    // ข้อมูลด้านอาชีพ
    companyName: "",
    agentLicenseId: "",
    nationalId: "",
    officeAddress: "",
    propertyTypes: [] as string[],
    serviceArea: "",
    currentAddress: "",
    businessLicenseId: "",
    // เอกสารต่างๆ
    agentLicenseFile: null as File | null,
    businessLicenseFile: null as File | null,
    idCardFile: null as File | null,
    // การยอมรับข้อกำหนด
    acceptTerms: false,
  });

  // ลบ debug useEffect เพื่อเพิ่มประสิทธิภาพ

  // Effect to fetch user data when modal opens
  useEffect(() => {
    const fetchUserData = async () => {
      if (isOpen && user) {
        try {
          console.log(
            "🔄 Fetching user data for agent registration...",
            user.id
          );

          // ลองดึงข้อมูลจาก users table ก่อน
          const { data: userData, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();

          if (error) {
            console.log(
              "⚠️ Error from users table, trying email lookup:",
              error
            );

            // ถ้าไม่พบด้วย id ลองหาด้วย email
            const { data: userByEmail, error: emailError } = await supabase
              .from("users")
              .select("*")
              .eq("email", user.email)
              .single();

            if (emailError && emailError.code !== "PGRST116") {
              // ถ้าเป็น error อื่นที่ไม่ใช่ "ไม่พบข้อมูล" ให้ throw
              throw emailError;
            }

            if (userByEmail) {
              console.log("✅ User data found by email:", userByEmail);
              setFormData(prev => ({
                ...prev,
                firstName: userByEmail.first_name || "",
                lastName: userByEmail.last_name || "",
                email: userByEmail.email || "",
                phone: userByEmail.phone || "",
                address: userByEmail.address || "",
              }));
            } else {
              // ไม่พบข้อมูลในตาราง users เลย ใช้ข้อมูลจาก auth user
              console.log(
                "📋 No user data found in database, using auth user data:",
                user
              );
              setFormData(prev => ({
                ...prev,
                firstName: user.user_metadata?.first_name || "",
                lastName: user.user_metadata?.last_name || "",
                email: user.email || "",
                phone: user.user_metadata?.phone || "",
              }));
            }
          } else if (userData) {
            console.log("✅ User data fetched successfully by ID:", userData);
            setFormData(prev => ({
              ...prev,
              firstName: userData.first_name || "",
              lastName: userData.last_name || "",
              email: userData.email || "",
              phone: userData.phone || "",
              address: userData.address || "",
            }));
          }

          // ถ้าไม่มีข้อมูลใน users table เลย ใช้ข้อมูลจาก auth user
          if (!userData) {
            console.log("📋 Using auth user data as fallback:", user);
            setFormData(prev => ({
              ...prev,
              firstName: user.user_metadata?.first_name || "",
              lastName: user.user_metadata?.last_name || "",
              email: user.email || "",
              phone: user.user_metadata?.phone || "",
            }));
          }
        } catch (error) {
          console.error("❌ Error fetching user data:", error);

          // ใช้ข้อมูลจาก auth user เป็น fallback
          console.log("📋 Using auth user data as fallback after error:", user);
          setFormData(prev => ({
            ...prev,
            firstName: user.user_metadata?.first_name || "",
            lastName: user.user_metadata?.last_name || "",
            email: user.email || "",
            phone: user.user_metadata?.phone || "",
          }));

          // แสดง toast เฉพาะกรณีที่เป็น error จริงๆ (ไม่ใช่แค่ไม่พบข้อมูล)
          if (error && (error as { code?: string }).code !== "PGRST116") {
            toast({
              variant: "destructive",
              title: "เกิดข้อผิดพลาด",
              description:
                "ไม่สามารถดึงข้อมูลผู้ใช้ได้ กรุณากรอกข้อมูลด้วยตัวเอง",
            });
          }
        }
      } else {
        // Modal not open or user not available
      }
    };

    fetchUserData();
  }, [isOpen, user]);
  // Effect to handle modal open/close
  useEffect(() => {
    if (isOpen) {
      setShowTermsModal(!formData.acceptTerms);
      setCurrentStep(1);
      setErrors({});
      // ไม่ reset formData ที่นี่ เพื่อให้ข้อมูลที่ fetch มาแสดงได้
    }
  }, [isOpen, formData.acceptTerms]);
  const validateStep1 = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "กรุณากรอกชื่อ";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "กรุณากรอกนามสกุล";
    }
    if (!formData.email.trim()) {
      newErrors.email = "กรุณากรอกอีเมล";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "กรุณากรอกเบอร์โทร";
    }
    // รหัสผ่านเป็น optional แต่ถ้ากรอกต้องตรงกัน
    if (
      formData.password.trim() &&
      formData.password !== formData.confirmPassword
    ) {
      newErrors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
    }
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = "กรุณายอมรับเงื่อนไขและข้อตกลง";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const validateStep2 = () => {
    const newErrors: { [key: string]: string } = {};

    // ตรวจสอบเฉพาะฟิลด์ที่มีเครื่องหมาย * เท่านั้น
    if (!formData.businessLicenseId.trim()) {
      newErrors.businessLicenseId = "กรุณากรอกเลขที่บัตรประชาชน";
    } else if (!/^\d{13}$/.test(formData.businessLicenseId.trim())) {
      newErrors.businessLicenseId =
        "กรุณากรอกเลขที่บัตรประชาชนให้ถูกต้อง (13 หลัก)";
    }

    if (!formData.currentAddress.trim()) {
      newErrors.currentAddress = "กรุณากรอกที่อยู่สำนักงาน";
    }

    if (formData.propertyTypes.length === 0) {
      newErrors.propertyTypes =
        "กรุณาเลือกประเภทอสังหาริมทรัพย์อย่างน้อย 1 ประเภท";
    }

    if (!formData.serviceArea.trim()) {
      newErrors.serviceArea = "กรุณาระบุพื้นที่ให้บริการ";
    }

    if (!formData.businessLicenseFile) {
      newErrors.businessLicenseFile = "กรุณาอัปโหลดเอกสารยืนยันตัวตน";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!user) {
        throw new Error("ไม่พบข้อมูลผู้ใช้");
      }
      console.log("🚀 Starting agent registration process...", {
        userId: user.id,
        email: user.email,
        formData: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          hasPassword: !!formData.password.trim(),
        },
      });

      // ตรวจสอบข้อมูลที่จำเป็นก่อนการส่ง
      if (
        !formData.firstName.trim() ||
        !formData.lastName.trim() ||
        !formData.email.trim() ||
        !formData.phone.trim() ||
        !formData.businessLicenseId.trim() ||
        !formData.currentAddress.trim() ||
        formData.propertyTypes.length === 0 ||
        !formData.serviceArea.trim()
      ) {
        throw new Error("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      }

      // ตรวจสอบรูปแบบเลขบัตรประชาชน
      if (!/^\d{13}$/.test(formData.businessLicenseId.trim())) {
        throw new Error("กรุณากรอกเลขที่บัตรประชาชนให้ถูกต้อง (13 หลัก)");
      }

      // แสดงข้อความเริ่มต้นการสมัคร
      toast({
        title: "⏳ กำลังสมัครเป็น Agent",
        description:
          "กรุณารอสักครู่ ระบบกำลังดำเนินการสมัครสำหรับ " +
          user.email +
          " ขั้นตอนนี้อาจใช้เวลาสักครู่",
        duration: 5000,
      });

      // 1. อัปโหลดไฟล์ PDF หากมี
      const documentUrls: string[] = [];

      if (formData.businessLicenseFile) {
        console.log("📄 Business license file found, attempting upload...");

        try {
          const fileName = `${user.id}/business_license_${Date.now()}.pdf`;

          // ลองใช้ bucket ที่มีอยู่แล้ว หรือข้ามการอัปโหลด
          console.log("🔧 Attempting to upload to existing bucket...");

          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("documents") // ลองใช้ bucket "documents" ที่มีอยู่แล้ว
              .upload(fileName, formData.businessLicenseFile);

          if (uploadError) {
            console.error("❌ File upload error:", uploadError);
            // ถ้า bucket "documents" ไม่มี ให้ลอง bucket อื่นหรือข้าม
            if (uploadError.message.includes("Bucket not found")) {
              console.warn(
                "⚠️ No suitable bucket found, skipping file upload..."
              );
            } else {
              console.warn("⚠️ File upload failed, skipping...");
            }
          } else {
            // ได้ URL ของไฟล์ที่อัปโหลด
            const { data: urlData } = supabase.storage
              .from("documents")
              .getPublicUrl(fileName);

            documentUrls.push(urlData.publicUrl);
            console.log(
              "✅ Document uploaded successfully:",
              urlData.publicUrl
            );
          }
        } catch (uploadErr) {
          console.error("❌ Upload process error:", uploadErr);
          console.warn(
            "⚠️ Skipping file upload due to error, continuing registration..."
          );
        }
      }

      // 2. เตรียมข้อมูลสำหรับตาราง agents
      const agentData = {
        user_id: user.id,
        company_name: formData.companyName || null,
        license_number: formData.agentLicenseId || null,
        business_license_id: formData.businessLicenseId,
        address: formData.currentAddress,
        national_id: formData.businessLicenseId, // ใช้เลขบัตรประชาชนเดียวกัน
        property_types: JSON.stringify(formData.propertyTypes),
        service_areas: JSON.stringify([formData.serviceArea]),
        verification_documents: JSON.stringify(documentUrls), // เก็บ URL ของไฟล์ที่อัปโหลด
        status: "pending",
      };

      console.log("📝 Prepared agent data:", agentData);

      // ตรวจสอบและสร้างข้อมูลผู้ใช้ในตาราง users ถ้ายังไม่มี
      console.log("🔍 Checking if user exists in users table...");
      const { data: existingUser, error: checkUserError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (checkUserError && checkUserError.code !== "PGRST116") {
        console.error("❌ Error checking user existence:", checkUserError);
        throw new Error(
          "ไม่สามารถตรวจสอบข้อมูลผู้ใช้ได้: " + checkUserError.message
        );
      }

      // ถ้าไม่มีผู้ใช้ในตาราง users ให้สร้างใหม่
      if (!existingUser) {
        console.log(
          "➕ Creating new user record in users table for:",
          user.email
        );

        const userPassword =
          formData.password.trim() || "temp_password_12345678";
        console.log(
          "🔐 Using password:",
          userPassword === "temp_password_12345678"
            ? "temporary"
            : "user provided"
        );

        const userInsertData = {
          id: user.id,
          email: user.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          password: userPassword,
          role: "customer",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log("📝 Inserting user data:", {
          ...userInsertData,
          password: "[HIDDEN]",
        });

        const { error: createUserError } = await supabase
          .from("users")
          .insert(userInsertData);

        if (createUserError) {
          console.error("❌ Error creating user record:", createUserError);
          throw new Error(
            "ไม่สามารถสร้างข้อมูลผู้ใช้ได้: " + createUserError.message
          );
        }
        console.log("✅ User record created successfully");
      }

      // 3. อัปเดตข้อมูลผู้ใช้ในตาราง users (ถ้าจำเป็น)
      const userUpdateData: {
        first_name: string;
        last_name: string;
        phone: string;
        updated_at: string;
      } = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        updated_at: new Date().toISOString(),
      };

      // ถ้ามีการเปลี่ยนรหัสผ่าน
      if (formData.password.trim()) {
        console.log("🔐 Updating user password...");
        try {
          const { error: passwordError } = await supabase.auth.updateUser({
            password: formData.password,
          });

          if (passwordError) {
            // ถ้า error เป็นเพราะรหัสผ่านเหมือนเดิม ให้ข้าม
            if (
              passwordError.message.includes("New password should be different")
            ) {
              console.log(
                "⚠️ Password is the same as current, skipping update"
              );
            } else {
              console.error("❌ Password update error:", passwordError);
              throw new Error(
                "ไม่สามารถเปลี่ยนรหัสผ่านได้: " + passwordError.message
              );
            }
          } else {
            console.log("✅ Password updated successfully");
          }
        } catch (passErr) {
          console.error("❌ Password update failed:", passErr);
          // ไม่ throw error เพื่อให้การสมัครยังคงดำเนินต่อไป
          console.warn("⚠️ Password update failed, continuing registration...");
        }
      }

      // อัปเดตข้อมูลในตาราง users
      console.log("📝 Updating user data...");
      const { error: userUpdateError } = await supabase
        .from("users")
        .update(userUpdateData)
        .eq("id", user.id);

      if (userUpdateError) {
        console.error("❌ User update error:", userUpdateError);
        throw new Error(
          "ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้: " + userUpdateError.message
        );
      }
      console.log("✅ User data updated successfully");

      // 4. ลบข้อมูลจากตาราง customers (ถ้ามี)
      console.log("🗑️ Removing customer record if exists...");
      const { error: deleteCustomerError } = await supabase
        .from("customers")
        .delete()
        .eq("user_id", user.id);

      if (deleteCustomerError) {
        console.warn(
          "⚠️ Customer delete warning (may not exist):",
          deleteCustomerError
        );
        // ไม่ throw error เพราะอาจจะไม่มีข้อมูลใน customers table
      } else {
        console.log("✅ Customer record removed successfully");
      }

      // 5. ตรวจสอบและเพิ่มข้อมูลลงตาราง agens
      console.log("🔍 Checking if agent record already exists...");
      const { data: existingAgent, error: checkAgentError } = await supabase
        .from("agens")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (checkAgentError && checkAgentError.code !== "PGRST116") {
        // ถ้าเป็น error อื่นที่ไม่ใช่ "ไม่พบข้อมูล"
        console.error("❌ Error checking existing agent:", checkAgentError);
        throw new Error(
          "ไม่สามารถตรวจสอบข้อมูล Agent ได้: " + checkAgentError.message
        );
      }

      if (existingAgent) {
        console.log("📝 Agent record already exists, updating instead...");
        const { error: agentUpdateError } = await supabase
          .from("agens")
          .update({
            ...agentData,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (agentUpdateError) {
          console.error("❌ Agent update error:", agentUpdateError);
          throw new Error(
            "ไม่สามารถอัปเดตข้อมูล Agent ได้: " + agentUpdateError.message
          );
        }
        console.log("✅ Agent record updated successfully");
      } else {
        console.log("➕ Creating new agent record...");
        const { error: agentInsertError } = await supabase
          .from("agens") // ตามชื่อตารางที่คุณให้มา
          .insert(agentData);

        if (agentInsertError) {
          console.error("❌ Agent insert error:", agentInsertError);
          throw new Error(
            "ไม่สามารถสร้างข้อมูล Agent ได้: " + agentInsertError.message
          );
        }
        console.log("✅ Agent record created successfully");
      }

      // 6. อัปเดต role ในตาราง users จาก customer เป็น agent (ขั้นตอนสำคัญ!)
      console.log("🔄 Updating user role to agent...");
      const { error: roleUpdateError } = await supabase
        .from("users")
        .update({
          role: "agent",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (roleUpdateError) {
        console.error("❌ Role update error:", roleUpdateError);
        throw new Error("ไม่สามารถอัปเดต Role ได้: " + roleUpdateError.message);
      }
      console.log("✅ User role updated to agent successfully");

      // 7. แสดงข้อความสำเร็จที่เด่นชัด
      console.log("🎉 Agent registration completed successfully!");

      // แสดง Success Modal แทน alert และ toast
      console.log("🎉 Showing Success Modal...");
      setShowSuccessModal(true);

      // ไม่ปิด modal หลักทันที ให้รอ Success Modal จัดการ
    } catch (error) {
      console.error("❌ Registration error:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description:
          error instanceof Error
            ? error.message
            : "ไม่สามารถสมัครเป็น Agent ได้",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleNextStep = () => {
    let isValid = false;

    if (currentStep === 1) {
      isValid = validateStep1();
    } else if (currentStep === 2) {
      isValid = validateStep2();
    }

    if (!isValid) {
      toast({
        variant: "destructive",
        title: "กรุณากรอกข้อมูลให้ครบถ้วน",
        description: "กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน",
      });
      return;
    }

    setCurrentStep(currentStep + 1);
    setErrors({});
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    onClose();
    // รีเฟรชหน้าหลังปิด modal
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  if (!isOpen) return null;

  const steps = [
    { label: "ข้อมูลส่วนตัว", number: 1 },
    { label: "ข้อมูลบริษัท", number: 2 },
    { label: "สรุปข้อมูล", number: 3 },
  ];

  return (
    <>
      <TermsModal
        isOpen={showTermsModal}
        onAccept={() => {
          setShowTermsModal(false);
          setFormData({ ...formData, acceptTerms: true });
        }}
        onClose={() => {
          setShowTermsModal(false);
          onClose(); // Close both modals
        }}
        fromAgent={true}
      />

      {/* Only show the rest of the modal if terms are accepted */}
      {!showTermsModal && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-gradient-to-br from-white via-gray-50 to-blue-50 backdrop-blur-sm z-[60] overflow-y-auto shadow-2xl rounded-l-2xl">
            {/* Header with back button */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 px-6 py-4 border-b border-gray-200">
              {" "}
              <div className="flex items-center">
                <button
                  onClick={onClose}
                  className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-white/60 transition-all duration-200"
                  aria-label="Close modal"
                  type="button"
                >
                  <X size={24} />
                </button>
              </div>
              <h2 className="text-2xl font-semibold text-center mt-6 mb-8 text-black">
                สมัครเป็น Agent
              </h2>
              {/* Progress Steps */}
              <div className="relative mb-8">
                {/* เส้นยาวใต้ stepper */}
                <div className="absolute left-0 right-0 top-5 h-1 bg-gray-200 z-0" />
                {/* เส้น active */}
                <div
                  className="absolute left-0 top-5 h-1 bg-gradient-to-r from-blue-600 to-purple-600 z-0 transition-all duration-300"
                  style={{
                    width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
                  }}
                />
                <div className="relative flex justify-between items-center z-10">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center flex-1"
                    >
                      {/* Step Circle */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200
                          ${currentStep >= step.number ? "bg-gradient-to-r from-blue-600 to-purple-600 border-blue-600 shadow-lg" : "bg-white border-gray-300"}`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full transition-all duration-200 ${currentStep >= step.number ? "bg-white" : "bg-gray-300"}`}
                        />
                      </div>
                      {/* Step Label */}
                      <span
                        className={`mt-2 text-xs text-center ${currentStep >= step.number ? "text-blue-600" : "text-gray-400"}`}
                      >
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6">
              {currentStep === 1 && (
                <div className="space-y-6">
                  {" "}
                  {/* Profile Image Upload */}
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-2">รูปโปรไฟล์</div>
                    <div className="w-24 h-24 mx-auto mb-4 relative">
                      <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        {formData.profileImage ? (
                          <Image
                            src={URL.createObjectURL(formData.profileImage)}
                            alt="Profile preview"
                            width={96}
                            height={96}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg
                            className="w-12 h-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Upload button */}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({ ...formData, profileImage: file });
                          }
                        }}
                        className="hidden"
                        id="profile-image-upload"
                        aria-label="Upload profile image"
                      />
                      <label
                        htmlFor="profile-image-upload"
                        className="absolute bottom-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-full cursor-pointer hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </label>

                      {/* Delete button - shown only when image exists */}
                      {formData.profileImage && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, profileImage: null })
                          }
                          className="absolute top-0 left-0 bg-red-500 text-white p-1.5 rounded-full cursor-pointer hover:bg-red-600 transition-all duration-200 shadow-lg"
                          aria-label="Delete profile image"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Personal Information */}
                  <div className="space-y-6">
                    {" "}
                    <div>
                      <label
                        htmlFor="firstName"
                        className="text-sm text-gray-600 mb-2 block"
                      >
                        ชื่อ *
                      </label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            firstName: e.target.value,
                          })
                        }
                        placeholder="กรอกชื่อ"
                        className="h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                        required
                      />
                      {errors.firstName && (
                        <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                          {errors.firstName}
                        </div>
                      )}
                    </div>{" "}
                    <div>
                      <label
                        htmlFor="lastName"
                        className="text-sm text-gray-600 mb-2 block"
                      >
                        นามสกุล *
                      </label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={e =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        placeholder="กรอกนามสกุล"
                        className="h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                        required
                      />
                      {errors.lastName && (
                        <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                          {errors.lastName}
                        </div>
                      )}
                    </div>{" "}
                    <div>
                      <label
                        htmlFor="email"
                        className="text-sm text-gray-600 mb-2 block"
                      >
                        อีเมล *
                      </label>
                      <Input
                        id="agent-register-email"
                        type="email"
                        value={formData.email}
                        onChange={e =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="Example@email.com"
                        className="h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                        required
                      />
                      {errors.email && (
                        <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                          {errors.email}
                        </div>
                      )}
                    </div>{" "}
                    <div>
                      <label
                        htmlFor="phone"
                        className="text-sm text-gray-600 mb-2 block"
                      >
                        เบอร์โทร *
                      </label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={e =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="081-111-1111"
                        className="h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                        required
                      />
                      {errors.phone && (
                        <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                          {errors.phone}
                        </div>
                      )}
                    </div>{" "}
                    <div>
                      <label
                        htmlFor="password"
                        className="text-sm text-gray-600 mb-2 block"
                      >
                        รหัสผ่าน (ไม่บังคับ)
                        <span className="text-xs text-gray-500 block mt-1">
                          หากกรอกข้อมูลในช่องนี้ รหัสผ่านของลูกค้าจะถูกเปลี่ยน
                        </span>
                      </label>
                      <div className="relative">
                        {" "}
                        <Input
                          id="agent-register-password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={formData.password}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                          placeholder="กรอกรหัสผ่าน (ไม่บังคับ)"
                          className="h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md transition-all duration-200 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-colors duration-200"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                          {errors.password}
                        </div>
                      )}
                    </div>{" "}
                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="text-sm text-gray-600 mb-2 block"
                      >
                        ยืนยันรหัสผ่าน (ไม่บังคับ)
                        <span className="text-xs text-gray-500 block mt-1">
                          กรอกเฉพาะเมื่อต้องการเปลี่ยนรหัสผ่าน
                        </span>
                      </label>
                      <div className="relative">
                        {" "}
                        <Input
                          id="agent-register-confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={formData.confirmPassword}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              confirmPassword: e.target.value,
                            })
                          }
                          placeholder="ยืนยันรหัสผ่าน (ไม่บังคับ)"
                          className="h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md transition-all duration-200 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-colors duration-200"
                          aria-label={
                            showConfirmPassword
                              ? "Hide confirm password"
                              : "Show confirm password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                          {errors.confirmPassword}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      *โปรดใช้อีเมลที่สามารถติดต่อได้จริง
                    </div>
                  </div>
                  {/* Terms and Conditions */}
                  <div className="flex items-start space-x-3 mt-4">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={formData.acceptTerms}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          acceptTerms: e.target.checked,
                        })
                      }
                      className="mt-1"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600">
                      ฉันยอมรับ{" "}
                      <a href="#" className="text-blue-600 hover:underline">
                        เงื่อนไขและข้อตกลง
                      </a>{" "}
                      ในการใช้งาน
                    </label>
                  </div>
                </div>
              )}{" "}
              {currentStep === 2 && (
                <div className="space-y-6">
                  {" "}
                  <div>
                    <label
                      htmlFor="companyName"
                      className="text-sm text-gray-600 mb-2 block"
                    >
                      ชื่อบริษัท/หน่วยงาน (ถ้ามี)
                    </label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          companyName: e.target.value,
                        })
                      }
                      placeholder="กรอกชื่อบริษัท"
                      className="h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                    />
                  </div>{" "}
                  <div>
                    <label
                      htmlFor="agentLicenseId"
                      className="text-sm text-gray-600 mb-2 block"
                    >
                      เลขที่ในอนุญาตนายหน้า (ถ้ามี)
                    </label>
                    <Input
                      id="agentLicenseId"
                      value={formData.agentLicenseId}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          agentLicenseId: e.target.value,
                        })
                      }
                      placeholder="กรอกเลขที่ใบอนุญาต"
                      className="h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                    />
                  </div>{" "}
                  <div>
                    <label
                      htmlFor="nationalId"
                      className="text-sm text-gray-600 mb-2 block"
                    >
                      เลขที่บัตรประจำตัวประชาชน{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="nationalId"
                      value={formData.businessLicenseId}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          businessLicenseId: e.target.value,
                        })
                      }
                      placeholder="กรอกเลขที่บัตรประชาชน"
                      className="h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                      required
                    />
                    {errors.businessLicenseId && (
                      <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                        {errors.businessLicenseId}
                      </div>
                    )}
                  </div>{" "}
                  <div>
                    <label
                      htmlFor="officeAddress"
                      className="text-sm text-gray-600 mb-2 block"
                    >
                      ที่อยู่สำนักงาน (หรือที่อยู่สำหรับติดต่อ){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="officeAddress"
                      value={formData.currentAddress}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          currentAddress: e.target.value,
                        })
                      }
                      placeholder="โปรดระบุ"
                      className="h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                      required
                    />
                    {errors.currentAddress && (
                      <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                        {errors.currentAddress}
                      </div>
                    )}
                  </div>{" "}
                  <div>
                    <div className="text-sm text-gray-600 mb-2">
                      ประเภทอสังหาริมทรัพย์ที่ดูแล (ขาย/เช่า/ประมูล){" "}
                      <span className="text-red-500">*</span>
                    </div>
                    <div className="space-y-2 p-4 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                      {[
                        { value: "sell", label: "ขาย" },
                        { value: "rent", label: "เช่า" },
                        { value: "auction", label: "ประมูล" },
                      ].map(option => (
                        <label
                          key={option.value}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.propertyTypes.includes(
                              option.value
                            )}
                            onChange={e => {
                              const newTypes = e.target.checked
                                ? [...formData.propertyTypes, option.value]
                                : formData.propertyTypes.filter(
                                    t => t !== option.value
                                  );
                              setFormData({
                                ...formData,
                                propertyTypes: newTypes,
                              });
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                          />
                          <span className="text-gray-900 font-medium">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                    {errors.propertyTypes && (
                      <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                        {errors.propertyTypes}
                      </div>
                    )}
                  </div>{" "}
                  <div>
                    <label
                      htmlFor="serviceArea"
                      className="text-sm text-gray-600 mb-2 block"
                    >
                      พื้นที่ที่ให้บริการ (จังหวัด/อำเภอ){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="serviceArea"
                      value={formData.serviceArea}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          serviceArea: e.target.value,
                        })
                      }
                      placeholder="โปรดระบุจังหวัด/อำเภอ"
                      className="h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                      required
                    />
                    {errors.serviceArea && (
                      <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                        {errors.serviceArea}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-2">
                      อัปโหลดเอกสารยืนยันตัวตน
                      (บัตรประชาชน/ใบอนุญาต/เอกสารบริษัท) ไฟล์ PDF{" "}
                      <span className="text-red-500">*</span>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-6 text-center transition-all duration-200 cursor-pointer hover:bg-blue-50/50">
                      {" "}
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({
                              ...formData,
                              businessLicenseFile: file,
                            });
                          }
                        }}
                        className="hidden"
                        id="identity-document-upload"
                        aria-label="Upload identity document PDF"
                      />
                      <label
                        htmlFor="identity-document-upload"
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col items-center">
                          <svg
                            className="w-8 h-8 text-gray-400 mb-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <span className="text-sm text-gray-600">
                            คลิกเพื่ออัปโหลดเอกสาร PDF
                          </span>
                          {formData.businessLicenseFile && (
                            <span className="text-sm text-blue-600 mt-1 font-medium">
                              {formData.businessLicenseFile.name}
                            </span>
                          )}
                        </div>
                      </label>
                    </div>{" "}
                    {errors.businessLicenseFile && (
                      <div className="text-red-500 text-sm mt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                        {errors.businessLicenseFile}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {currentStep === 3 && (
                <div className="space-y-6">
                  {" "}
                  <div className="text-center mb-6">
                    <div className="text-sm text-gray-600 mb-4">รูปโปรไฟล์</div>{" "}
                    <div className="w-20 h-20 mx-auto mb-4 relative">
                      <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        {formData.profileImage ? (
                          <Image
                            src={URL.createObjectURL(formData.profileImage)}
                            alt="Profile preview"
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg
                            className="w-12 h-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        )}
                      </div>
                      {isEditing && (
                        <>
                          {/* Upload button */}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setFormData({
                                  ...formData,
                                  profileImage: file,
                                });
                              }
                            }}
                            className="hidden"
                            id="profile-image-upload-step3"
                            aria-label="Upload profile image for step 3"
                          />
                          <label
                            htmlFor="profile-image-upload-step3"
                            className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                          </label>

                          {/* Delete button - shown only when image exists */}
                          {formData.profileImage && (
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({ ...formData, profileImage: null })
                              }
                              className="absolute top-0 left-0 bg-red-500 text-white p-1.5 rounded-full cursor-pointer hover:bg-red-600 transition-all duration-200 shadow-lg"
                              aria-label="Delete profile image"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>{" "}
                  {/* Summary of all information */}
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-2">ชื่อ</div>
                      <Input
                        value={formData.firstName}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            firstName: e.target.value,
                          })
                        }
                        placeholder="กรอกชื่อ"
                        className={`h-12 bg-white/80 backdrop-blur-sm border-2 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-200 ${
                          isEditing
                            ? "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:shadow-md"
                            : "border-gray-200 bg-gray-50/50"
                        }`}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">นามสกุล</div>
                      <Input
                        value={formData.lastName}
                        onChange={e =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        placeholder="กรอกนามสกุล"
                        className={`h-12 bg-white/80 backdrop-blur-sm border-2 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-200 ${
                          isEditing
                            ? "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:shadow-md"
                            : "border-gray-200 bg-gray-50/50"
                        }`}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">อีเมล</div>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={e =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="Example@email.com"
                        className={`h-12 bg-white/80 backdrop-blur-sm border-2 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-200 ${
                          isEditing
                            ? "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:shadow-md"
                            : "border-gray-200 bg-gray-50/50"
                        }`}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">เบอร์โทร</div>
                      <Input
                        value={formData.phone}
                        onChange={e =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="081-111-1111"
                        className={`h-12 bg-white/80 backdrop-blur-sm border-2 rounded-xl text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-200 ${
                          isEditing
                            ? "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:shadow-md"
                            : "border-gray-200 bg-gray-50/50"
                        }`}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">รหัสผ่าน</div>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                          placeholder="••••••••"
                          className="h-12 bg-white border-gray-300 text-gray-900 pr-12"
                          disabled={!isEditing}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          disabled={!isEditing}
                        >
                          {showPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">
                        ชื่อบริษัท/หน่วยงาน (ถ้ามี)
                      </div>
                      <Input
                        value={formData.companyName}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            companyName: e.target.value,
                          })
                        }
                        placeholder="กรอกชื่อบริษัท"
                        className="h-12 bg-white border-gray-300 text-gray-900"
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">
                        เลขที่ใบอนุญาตนายหน้า (ถ้ามี)
                      </div>
                      <Input
                        value={formData.agentLicenseId}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            agentLicenseId: e.target.value,
                          })
                        }
                        placeholder="กรอกเลขที่ใบอนุญาต"
                        className="h-12 bg-white border-gray-300 text-gray-900"
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">
                        เลขที่บัตรประจำตัวประชาชน{" "}
                        <span className="text-red-500">*</span>
                      </div>
                      <Input
                        value={formData.businessLicenseId}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            businessLicenseId: e.target.value,
                          })
                        }
                        placeholder="กรอกเลขที่บัตรประชาชน"
                        className="h-12 bg-white border-gray-300 text-gray-900"
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">
                        ที่อยู่สำนักงาน (หรือที่อยู่สำหรับติดต่อ){" "}
                        <span className="text-red-500">*</span>
                      </div>
                      <Input
                        value={formData.currentAddress}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            currentAddress: e.target.value,
                          })
                        }
                        placeholder="โปรดระบุ"
                        className="h-12 bg-white border-gray-300 text-gray-900"
                        disabled={!isEditing}
                      />
                    </div>{" "}
                    <div>
                      <div className="text-sm text-gray-600 mb-2">
                        ประเภทอสังหาริมทรัพย์ที่ดูแล (ขาย/เช่า/ประมูล){" "}
                        <span className="text-red-500">*</span>
                      </div>
                      <div className="space-y-2 p-3 border border-gray-300 rounded-md bg-white">
                        {[
                          { value: "sell", label: "ขาย" },
                          { value: "rent", label: "เช่า" },
                          { value: "auction", label: "ประมูล" },
                        ].map(option => (
                          <label
                            key={option.value}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              checked={formData.propertyTypes.includes(
                                option.value
                              )}
                              onChange={e => {
                                const newTypes = e.target.checked
                                  ? [...formData.propertyTypes, option.value]
                                  : formData.propertyTypes.filter(
                                      t => t !== option.value
                                    );
                                setFormData({
                                  ...formData,
                                  propertyTypes: newTypes,
                                });
                              }}
                              disabled={!isEditing}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span
                              className={`${!isEditing ? "text-gray-500" : "text-gray-900"}`}
                            >
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">
                        พื้นที่ที่ให้บริการ (จังหวัด/อำเภอ){" "}
                        <span className="text-red-500">*</span>
                      </div>
                      <Input
                        value={formData.serviceArea}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            serviceArea: e.target.value,
                          })
                        }
                        placeholder="โปรดระบุจังหวัด/อำเภอ"
                        className="h-12 bg-white border-gray-300 text-gray-900"
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">
                        อัปโหลดเอกสารยืนยันตัวตน
                        (บัตรประชาชน/ใบอนุญาต/เอกสารบริษัท) ไฟล์ PDF{" "}
                        <span className="text-red-500">*</span>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        {" "}
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFormData({
                                ...formData,
                                businessLicenseFile: file,
                              });
                            }
                          }}
                          className="hidden"
                          id="identity-document-upload-step3"
                          disabled={!isEditing}
                          aria-label="Upload identity document PDF for step 3"
                        />
                        <label
                          htmlFor="identity-document-upload-step3"
                          className={`cursor-pointer text-gray-500 text-sm ${!isEditing ? "pointer-events-none" : ""}`}
                        >
                          {formData.businessLicenseFile
                            ? formData.businessLicenseFile.name
                            : "อัปโหลดเอกสาร PDF"}
                        </label>
                      </div>
                    </div>
                    {/* Terms and Conditions Confirmation */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="terms-confirmation"
                          checked={formData.acceptTerms}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              acceptTerms: e.target.checked,
                            })
                          }
                          className="mt-1"
                          disabled={!isEditing}
                        />
                        <label
                          htmlFor="terms-confirmation"
                          className="text-sm text-gray-600"
                        >
                          ฉันได้อ่านและยอมรับ{" "}
                          <a href="#" className="text-blue-600 hover:underline">
                            เงื่อนไขและข้อตกลง
                          </a>{" "}
                          ในการใช้งานแล้ว
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Navigation Buttons */}
              <div className="mt-8 space-y-4">
                {" "}
                <Button
                  className="w-full h-12 bg-[#007AFF] hover:bg-[#0066d6] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
                  onClick={() => {
                    if (currentStep < 3) {
                      // For step 2, validate required fields before proceeding
                      if (currentStep === 2) {
                        if (!validateStep2()) {
                          toast({
                            variant: "destructive",
                            title: "กรุณากรอกข้อมูลให้ครบถ้วน",
                            description:
                              "กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน",
                          });
                          return;
                        }
                      }
                      setCurrentStep(currentStep + 1);
                    } else {
                      if (isEditing) {
                        setIsEditing(false);
                      } else {
                        handleSubmit(
                          new Event(
                            "submit"
                          ) as unknown as React.FormEvent<HTMLFormElement>
                        );
                      }
                    }
                  }}
                  disabled={isLoading}
                >
                  {currentStep === 3
                    ? isEditing
                      ? "บันทึก"
                      : "ยันยัน"
                    : "ถัดไป"}
                </Button>
                {currentStep > 1 && (
                  <Button
                    className="w-full h-12 bg-white hover:bg-gray-50 text-[#007AFF] border border-[#007AFF] rounded-xl shadow hover:shadow-md transition-all duration-200 font-semibold focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
                    onClick={() => {
                      if (currentStep === 3) {
                        setIsEditing(!isEditing);
                      } else {
                        setCurrentStep(currentStep - 1);
                      }
                    }}
                    disabled={isLoading}
                  >
                    {currentStep === 3 ? "แก้ไขข้อมูล" : "ย้อนกลับ"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Success Modal */}
      <AgentSuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        userInfo={{
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
        }}
      />
    </>
  );
}
