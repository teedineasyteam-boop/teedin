import { useLanguage } from "@/contexts/language-context";
import { useState } from "react";

interface AgentRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentRegisterModal({
  isOpen,
  onClose,
}: AgentRegisterModalProps) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual agent registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert(t("agent_modal_redirecting"));
      onClose();
    } catch (error) {
      console.error("Error registering agent:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactStaff = () => {
    // TODO: Implement contact staff functionality
    alert(t("agent_modal_contacting"));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-lg">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 text-blue-500 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-semibold mb-4 text-blue-700">
            {t("agent_modal_title")}
          </h3>
          <p className="text-gray-700 mb-6 text-base leading-relaxed">
            {t("agent_modal_description_line1")}
            <br />
            {t("agent_modal_description_line2")}
          </p>
          <div className="space-y-3">
            <button
              onClick={handleRegister}
              disabled={isLoading}
              className={`w-full py-2 text-white rounded-md text-lg font-bold shadow transition-colors ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t("agent_modal_register_loading")}
                </div>
              ) : (
                <span>{t("agent_modal_register_online")}</span>
              )}
            </button>
            <button
              onClick={handleContactStaff}
              className="w-full py-2 border border-gray-300 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
            >
              {t("agent_modal_contact_staff")}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-800 transition-colors"
            >
              {t("agent_modal_close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
