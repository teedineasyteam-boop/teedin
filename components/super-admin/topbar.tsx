"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from "lucide-react";

// สร้าง wrapper สำหรับ icons เพื่อป้องกัน hydration mismatch
const IconWrapper = ({ children }: { children: React.ReactNode }) => (
  <span suppressHydrationWarning>{children}</span>
);

interface TopBarProps {
  onLogout: () => void;
}

function SuperAdminTopBarContent({ onLogout }: TopBarProps) {
  return (
    <div className="bg-white border-b border-gray-100 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <IconWrapper>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </IconWrapper>
            <Input
              placeholder="ค้นหา..."
              className="pl-10 w-72 h-9 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Notification Button */}
          <Button
            variant="ghost"
            size="sm"
            className="relative h-9 w-9 p-0 hover:bg-gray-100 group"
          >
            <IconWrapper>
              <Bell className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-all duration-200 bell-swing" />
            </IconWrapper>

            {/* Main notification badge with multiple animations */}
            <div className="absolute -top-1 -right-1">
              {/* Ping animation background */}
              <div
                className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75 
                            [animation-duration:1.5s]"
              ></div>

              {/* Pulsing ring */}
              <div
                className="absolute inset-0 w-4 h-4 bg-red-400 rounded-full animate-pulse 
                            ring-2 ring-red-300 ring-opacity-50 [animation-duration:1s]"
              ></div>

              {/* Main badge with glow effect */}
              <Badge
                variant="destructive"
                className="relative text-xs min-w-[16px] h-4 px-1 bg-red-500 hover:bg-red-600 
                           shadow-lg transform transition-all duration-300 hover:scale-110
                           animate-bounce [animation-duration:2s] [animation-delay:0.5s] [animation-iteration-count:3]
                           hover:animate-none notification-glow"
              >
                <span className="font-semibold relative z-10 text-white">
                  3
                </span>
              </Badge>
            </div>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-2 h-9 px-3 hover:bg-gray-100"
              >
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <IconWrapper>
                    <User className="h-3 w-3 text-blue-600" />
                  </IconWrapper>
                </div>
                <span className="text-sm text-gray-700">Admin</span>
                <IconWrapper>
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                </IconWrapper>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <IconWrapper>
                  <User className="mr-2 h-4 w-4" />
                </IconWrapper>
                โปรไฟล์
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconWrapper>
                  <Settings className="mr-2 h-4 w-4" />
                </IconWrapper>
                ตั้งค่า
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
              >
                <IconWrapper>
                  <LogOut className="mr-2 h-4 w-4" />
                </IconWrapper>
                ออกจากระบบ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export function SuperAdminTopBar({ onLogout }: TopBarProps) {
  return <SuperAdminTopBarContent onLogout={onLogout} />;
}
