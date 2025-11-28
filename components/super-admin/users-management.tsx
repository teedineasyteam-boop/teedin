"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

// Toast Animation CSS
const toastStyles = `
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
`;

// Inject styles
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = toastStyles;
  document.head.appendChild(styleSheet);
}

interface UserRecord {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string;
  created_at?: string | null;
}

// Custom Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  startIndex: number;
  endIndex: number;
  totalItems: number;
}

const CustomPagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  startIndex,
  endIndex,
  totalItems,
}) => {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter((v, i, a) => a.indexOf(v) === i);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
      <div className="text-sm text-gray-700">
        แสดง <span className="font-medium">{startIndex + 1}</span> ถึง{" "}
        <span className="font-medium">{Math.min(endIndex, totalItems)}</span>{" "}
        จากทั้งหมด <span className="font-medium">{totalItems}</span> คน
      </div>

      <div className="flex items-center space-x-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          ก่อนหน้า
        </button>

        {/* Page Numbers */}
        <div className="flex items-center space-x-1">
          {getVisiblePages().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={page === "..."}
              className={`
                px-3 py-2 text-sm font-medium rounded-lg transition-colors
                ${
                  page === currentPage
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                    : page === "..."
                      ? "text-gray-400 cursor-default"
                      : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                }
              `}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ถัดไป
          <svg
            className="w-4 h-4 ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  type?: "warning" | "success";
}

// Modal Component
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  type = "warning",
}) => {
  if (!isOpen) return null;

  const getModalColors = () => {
    switch (type) {
      case "success":
        return {
          icon: "text-green-600",
          button: "bg-green-600 hover:bg-green-700",
          border: "border-green-200",
        };
      case "warning":
        return {
          icon: "text-red-600",
          button: "bg-red-600 hover:bg-red-700",
          border: "border-red-200",
        };
      default:
        return {
          icon: "text-gray-600",
          button: "bg-gray-600 hover:bg-gray-700",
          border: "border-gray-200",
        };
    }
  };

  const colors = getModalColors();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all"
        onClick={event => event.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${type === "success" ? "bg-green-100" : "bg-red-100"}`}
            >
              {type === "success" ? (
                <svg
                  className={`w-6 h-6 ${colors.icon}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className={`w-6 h-6 ${colors.icon}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.734-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="mb-6">{children}</div>
        </div>
      </div>
    </div>
  );
};

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userEmail: string;
  loading: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
  loading,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ยืนยันการลบผู้ใช้งาน"
      type="warning"
    >
      <div className="space-y-4">
        <p className="text-gray-700">
          คุณต้องการลบผู้ใช้งาน{" "}
          <span className="font-semibold text-red-600">{userEmail}</span>{" "}
          ใช่หรือไม่?
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">
            <strong>คำเตือน:</strong> การลบผู้ใช้งานนี้จะส่งผลให้:
          </p>
          <ul className="text-sm text-red-700 mt-2 space-y-1">
            <li>• ข้อมูลส่วนตัวทั้งหมดจะถูกลบถาวร</li>
            <li>• ข้อมูลการประกาศอสังหาริมทรัพย์ที่เกี่ยวข้องจะหายไป</li>
            <li>• ประวัติการทำรายการทั้งหมดจะถูกลบ</li>
            <li>• ไม่สามารถกู้คืนข้อมูลได้หลังจากลบแล้ว</li>
          </ul>
        </div>
        <div className="flex space-x-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            disabled={loading}
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                กำลังลบ...
              </>
            ) : (
              "ยืนยันลบ"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Success Modal
interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ลบผู้ใช้งานเสร็จสิ้น"
      type="success"
    >
      <div className="text-center">
        <p className="text-gray-700 mb-4">ลบผู้ใช้งานออกจากระบบเรียบร้อยแล้ว</p>
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
          <span>กำลังปิดหน้าต่างอัตโนมัติ...</span>
        </div>
      </div>
    </Modal>
  );
};

const SuperAdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);

  // Pagination states
  const USERS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // คำนวณข้อมูลสำหรับ pagination
  const totalPages = Math.ceil(users.length / USERS_PER_PAGE);
  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const endIndex = startIndex + USERS_PER_PAGE;
  const currentUsers = users.slice(startIndex, endIndex);

  // Reset หน้าเมื่อ users เปลี่ยน
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [users.length, totalPages, currentPage]);

  // แสดง toast notification เมื่อรีเฟรชสำเร็จ
  useEffect(() => {
    if (showRefreshSuccess) {
      const timer = setTimeout(() => {
        setShowRefreshSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showRefreshSuccess]);

  // ตาม schema: role เป็น 'customer', 'agent', 'admin', 'super_admin' (lowercase)
  // แสดงเฉพาะ agent และ customer (ไม่แสดง admin และ super_admin)
  const allowedRoles = useMemo(() => new Set(["agent", "customer"]), []);

  const normalizeRole = useCallback((role?: string | null) => {
    if (!role) return "";
    // role ในฐานข้อมูลเป็น lowercase อยู่แล้วตาม schema
    // แต่เพื่อความปลอดภัย ให้ trim และ lowercase อีกครั้ง
    const normalized = role.trim().toLowerCase();
    // Debug: log ถ้า role ไม่ตรงกับที่คาดไว้
    if (normalized && !["agent", "customer"].includes(normalized)) {
      console.warn(
        `⚠️ Unknown role format: "${role}" → normalized: "${normalized}"`
      );
    }
    return normalized;
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // เรียก API route ที่ใช้ service role key เพื่อ bypass RLS
      const response = await fetch("/api/admin/users?role=all&limit=1000");

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const result = await response.json();
      const data = result.users || [];

      // ตรวจสอบข้อมูลที่ดึงมา
      if (!data || data.length === 0) {
        console.warn("⚠️ [Users Management] No users found in database");
        setUsers([]);
        return;
      }

      // แสดงข้อมูลสรุป
      const uniqueRoles = new Set(data.map((user: UserRecord) => user.role));
      console.log(
        `📊 [Users Management] Fetched ${data.length} users with roles:`,
        Array.from(uniqueRoles)
      );

      // Filter เฉพาะ agent และ customer (ไม่แสดง admin และ super_admin)
      const filteredUsers = data.filter((user: UserRecord) => {
        const normalized = normalizeRole(user.role);
        return allowedRoles.has(normalized);
      });

      console.log(
        `✅ [Users Management] Showing ${filteredUsers.length} users (filtered: ${data.length - filteredUsers.length} admin/super_admin)`
      );

      setUsers(filteredUsers);
      setLastRefreshTime(new Date());
      setShowRefreshSuccess(true);
    } catch (err: unknown) {
      console.error("❌ [Users Management] Exception:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [allowedRoles, normalizeRole]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteClick = (user: UserRecord) => {
    setSelectedUser(user);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    setDeletingId(selectedUser.id);

    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: selectedUser.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user");
      }

      // อัพเดท state โดยไม่ต้องเรียก API ใหม่
      setUsers(prevUsers =>
        prevUsers.filter(user => user.id !== selectedUser.id)
      );
      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("เกิดข้อผิดพลาดในการลบผู้ใช้");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCloseConfirmModal = () => {
    setShowConfirmModal(false);
    setSelectedUser(null);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSelectedUser(null);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-500";
      case "admin":
        return "bg-purple-500";
      case "agent":
        return "bg-blue-500";
      case "customer":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "super_admin":
        return "ซูเปอร์แอดมิน";
      case "admin":
        return "แอดมิน";
      case "agent":
        return "เอเจนต์";
      case "customer":
        return "ลูกค้า";
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            จัดการผู้ใช้งาน
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                รายชื่อผู้ใช้งาน ({users.length} คน) - เฉพาะ Agent และ Customer
              </h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={fetchUsers}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="รีเฟรชข้อมูลผู้ใช้งาน"
                >
                  <svg
                    className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {loading ? "กำลังโหลด..." : "รีเฟรช"}
                </button>
                <div className="text-white/80 text-sm">
                  อัพเดทล่าสุด:{" "}
                  {lastRefreshTime.toLocaleString("th-TH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-4 px-6 text-left font-semibold text-gray-700">
                    ผู้ใช้
                  </th>
                  <th className="py-4 px-6 text-left font-semibold text-gray-700">
                    ข้อมูลติดต่อ
                  </th>
                  <th className="py-4 px-6 text-center font-semibold text-gray-700">
                    บทบาท
                  </th>
                  <th className="py-4 px-6 text-center font-semibold text-gray-700">
                    วันที่สมัคร
                  </th>
                  <th className="py-4 px-6 text-center font-semibold text-gray-700">
                    สถานะ
                  </th>
                  <th className="py-4 px-6 text-center font-semibold text-gray-700">
                    การจัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="text-gray-500">
                          กำลังโหลดข้อมูล...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                        <span className="text-gray-500 text-lg">
                          ไม่มีผู้ใช้งานในระบบ
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentUsers.map(user => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 transition-colors duration-200"
                    >
                      {/* ผู้ใช้ */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {user.first_name?.charAt(0) || "U"}
                            {user.last_name?.charAt(0) || ""}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {user.id?.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ข้อมูลติดต่อ */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                              />
                            </svg>
                            <span className="text-gray-700">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center space-x-2">
                              <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                              </svg>
                              <span className="text-gray-700">
                                {user.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* บทบาท */}
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white ${getRoleColor(user.role)}`}
                        >
                          {getRoleText(user.role)}
                        </span>
                      </td>

                      {/* วันที่สมัคร */}
                      <td className="py-4 px-6 text-center">
                        <div className="text-sm text-gray-600">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString(
                                "th-TH",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )
                            : "-"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleTimeString(
                                "th-TH",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : ""}
                        </div>
                      </td>

                      {/* สถานะ */}
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                          ใช้งานได้
                        </span>
                      </td>

                      {/* การจัดการ */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleDeleteClick(user)}
                            disabled={deletingId === user.id}
                            className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <CustomPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={users.length}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmDelete}
        userEmail={selectedUser?.email || ""}
        loading={deletingId !== null}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
      />

      {/* Refresh Success Toast */}
      {showRefreshSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in-right">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>รีเฟรชข้อมูลสำเร็จ! โหลดข้อมูล {users.length} คน</span>
        </div>
      )}
    </div>
  );
};

export default SuperAdminUsers;
