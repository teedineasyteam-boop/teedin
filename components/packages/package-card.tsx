"use client";

import { useLanguage } from "@/contexts/language-context";
import { Check, X } from "lucide-react";
import React from "react";

export interface ServiceCard {
  titleTh: string;
  titleEn: string;
  priceTh: string;
  priceEn: string;
  descriptionTh: string;
  descriptionEn: string;
  featuresTh: string[];
  featuresEn: string[];
  notIncludedTh?: string[];
  notIncludedEn?: string[];
  icon: React.ReactNode;
}

interface PricingCardProps {
  tier: ServiceCard;
  featured?: boolean;
  onPurchase?: (tier: ServiceCard) => void;
}

export const SERVICE_PACKAGES: ServiceCard[] = [
  {
    titleTh: "แพ็กลองใช้ 3 วัน",
    titleEn: "Trial Pack – 3 Days",
    priceTh: "69",
    priceEn: "69",
    descriptionTh: "เหมาะแค่ลองใช้ (เฉลี่ยวันละ 23 บาท)",
    descriptionEn: "Good for testing (Avg. 23 THB/day)",
    featuresTh: [
      "หมุดเด่น/เคลื่อนไหวบนแผนที่",
      "ดันประกาศอยู่บนสุดหน้าค้นหา",
      "กระจาย Card ทั่วเว็บเพิ่มการมองเห็น",
      "เหมาะสำหรับทดลองระบบ",
    ],
    featuresEn: [
      "Prominent/Animated Map Pin",
      "Top Ranking in Search",
      "Boosted Visibility Across Site",
      "Ideal for system testing",
    ],
    notIncludedTh: ["ความคุ้มค่าระยะยาว", "ราคาเฉลี่ยต่อวันถูกที่สุด"],
    notIncludedEn: ["Long-term value", "Lowest daily rate"],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <path d="M20 12a8 8 0 1 0-8 8 8 8 0 0 0 8-8Z" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    titleTh: "แพ็กเริ่มจริงจัง 7 วัน",
    titleEn: "Getting Serious – 7 Days",
    priceTh: "99",
    priceEn: "99",
    descriptionTh: "คุ้มกว่า 3 วันเล็กน้อย (เฉลี่ยวันละ ~14 บาท)",
    descriptionEn: "Better value than 3 days (Avg. ~14 THB/day)",
    featuresTh: [
      "หมุดเด่น/เคลื่อนไหวบนแผนที่",
      "ดันประกาศอยู่บนสุดหน้าค้นหา",
      "กระจาย Card ทั่วเว็บเพิ่มการมองเห็น",
      "ประหยัดกว่าแพ็ก 3 วัน",
    ],
    featuresEn: [
      "Prominent/Animated Map Pin",
      "Top Ranking in Search",
      "Boosted Visibility Across Site",
      "Cheaper daily rate than 3-day",
    ],
    notIncludedTh: ["ความคุ้มค่าระยะยาว"],
    notIncludedEn: ["Long-term value"],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    titleTh: "แพ็กต่อเนื่อง 15 วัน",
    titleEn: "Continuous – 15 Days",
    priceTh: "129",
    priceEn: "129",
    descriptionTh: "เริ่มเห็นผลชัดเจน (เฉลี่ยวันละ 8.6 บาท)",
    descriptionEn: "Clearer results (Avg. 8.6 THB/day)",
    featuresTh: [
      "หมุดเด่น/เคลื่อนไหวบนแผนที่",
      "ดันประกาศอยู่บนสุดหน้าค้นหา",
      "กระจาย Card ทั่วเว็บเพิ่มการมองเห็น",
      "ระยะเวลาพอเหมาะเพื่อดูผลลัพธ์",
    ],
    featuresEn: [
      "Prominent/Animated Map Pin",
      "Top Ranking in Search",
      "Boosted Visibility Across Site",
      "Good duration to see results",
    ],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
        <path d="M17 14h-6" />
        <path d="M13 18H7" />
        <path d="M7 14h.01" />
        <path d="M17 18h.01" />
      </svg>
    ),
  },
  {
    titleTh: "แพ็กฮิต 30 วัน",
    titleEn: "Best Seller – 30 Days",
    priceTh: "199",
    priceEn: "199",
    descriptionTh: "ฮิตที่สุด / คุ้มสุด / คนเลือกเยอะสุด",
    descriptionEn: "Most Popular / Best Value",
    featuresTh: [
      "หมุดเด่น/เคลื่อนไหวบนแผนที่",
      "ดันประกาศอยู่บนสุดหน้าค้นหา",
      "กระจาย Card ทั่วเว็บเพิ่มการมองเห็น",
      "ราคาเฉลี่ยต่อวันสุดคุ้ม (6.6 บาท)",
      "เพิ่มโอกาสปิดการขายสูงสุด",
    ],
    featuresEn: [
      "Prominent/Animated Map Pin",
      "Top Ranking in Search",
      "Boosted Visibility Across Site",
      "Great daily value (6.6 THB)",
      "Highest sales opportunity",
    ],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.2-2.2.6-3.3.7-1.9 2.5-3.2 4.4-3.2 1.5 0 2.5.8 2.5 2.5z" />
      </svg>
    ),
  },
  {
    titleTh: "แพ็กคุ้มสุด 45 วัน",
    titleEn: "Max Value – 45 Days",
    priceTh: "250",
    priceEn: "250",
    descriptionTh: "เฉลี่ยวันละ 5.5 บาทเท่านั้น",
    descriptionEn: "Only ~5.5 THB per day",
    featuresTh: [
      "หมุดเด่น/เคลื่อนไหวบนแผนที่",
      "ดันประกาศอยู่บนสุดหน้าค้นหา",
      "กระจาย Card ทั่วเว็บเพิ่มการมองเห็น",
      "ราคาต่อวันถูกที่สุดในทุกแพ็ก",
      "อยู่ยาว 45 วัน ไม่ต้องเติมบ่อย",
    ],
    featuresEn: [
      "Prominent/Animated Map Pin",
      "Top Ranking in Search",
      "Boosted Visibility Across Site",
      "Lowest daily rate of all packs",
      "Long 45-day duration",
    ],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
];

export function PricingCard({ tier, featured, onPurchase }: PricingCardProps) {
  const { language } = useLanguage();
  const isEn = language === "en";

  const title = isEn ? tier.titleEn : tier.titleTh;
  const price = isEn ? tier.priceEn : tier.priceTh;
  const description = isEn ? tier.descriptionEn : tier.descriptionTh;
  const features = isEn ? tier.featuresEn : tier.featuresTh;
  const notIncluded = isEn ? tier.notIncludedEn : tier.notIncludedTh;

  const ctaLabel = isEn ? "Purchase Now" : "ซื้อเลย";
  const paymentNote = isEn ? "one-time payment" : "ชำระครั้งเดียว";
  const keyFeaturesLabel = isEn ? "Key Features:" : "ฟีเจอร์หลัก:";
  const currency = "฿";

  return (
    <div
      className={`relative flex flex-col h-full rounded-3xl p-6 transition-all duration-300 ${
        featured
          ? "z-10 bg-white shadow-2xl xl:scale-110 border border-blue-100"
          : "bg-white shadow-lg border border-slate-100 hover:shadow-xl hover:-translate-y-1"
      }`}
    >
      {featured && (
        <div className="absolute -top-4 right-6 rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-md">
          {isEn ? "Most Popular" : "ยอดนิยม"}
        </div>
      )}

      <div className="mb-5">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-900">
          {tier.icon}
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{paymentNote}</p>
      </div>

      <div className="mb-6 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-slate-900">
          {currency}
          {price}
        </span>
        {/* <span className="text-sm font-medium text-slate-400 line-through">
          $199
        </span> */}
      </div>

      <button
        onClick={() => onPurchase?.(tier)}
        className={`mb-8 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors ${
          featured
            ? "bg-slate-900 text-white hover:bg-slate-800"
            : "bg-slate-900 text-white hover:bg-slate-800"
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <rect width="18" height="12" x="3" y="6" rx="2" />
            <path d="M3 10h18" />
          </svg>
          {ctaLabel}
        </div>
      </button>

      <div className="flex-1">
        <div className="mb-4 text-sm font-semibold text-slate-900">
          {keyFeaturesLabel}
        </div>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li
              key={index}
              className="flex items-start gap-3 text-sm text-slate-600"
            >
              <Check className="h-4 w-4 shrink-0 text-slate-900" />
              <span>{feature}</span>
            </li>
          ))}
          {notIncluded?.map((feature, index) => (
            <li
              key={`not-${index}`}
              className="flex items-start gap-3 text-sm text-slate-400"
            >
              <X className="h-4 w-4 shrink-0 text-slate-300" />
              <span className="line-through decoration-slate-300">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
