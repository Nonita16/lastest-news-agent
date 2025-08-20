"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  TransitionChild,
} from "@headlessui/react";
import { XMarkIcon, Bars3Icon } from "@heroicons/react/24/outline";
import React, { useEffect, useState } from "react";

import { usePersistence } from "@/lib/hooks/usePersistence";
import { usePreferences } from "@/lib/hooks/usePreferences";

import { PreferencesChecklist } from "./components/PreferencesChecklist";
import { ChatInterface } from "./components/ChatInterface";
import { NetworkStatus, OfflineFallback } from "./components/NetworkStatus";

import type { ChatMessage, UserPreferences } from "@/types";

function SidebarContent({
  preferences,
}: {
  preferences: UserPreferences;
}): React.JSX.Element {
  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Your Preferences</h2>
      <PreferencesChecklist preferences={preferences} />
    </>
  );
}

export default function ChatPage(): React.JSX.Element {
  const [isRecovering, setIsRecovering] = useState(true);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>(
    `conv-${Date.now()}`
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { preferences, updatePreferences } = usePreferences();
  const { recoverData, savePreferences, saveSession } = usePersistence();

  // Check if mobile on mount and handle resize
  useEffect(() => {
    const checkMobile = (): void => {
      const mobile =
        typeof window !== "undefined" ? window.innerWidth < 768 : false;
      const wasDesktop = !isMobile && !mobile;
      setIsMobile(mobile);

      // If transitioning from desktop to mobile, close drawer
      if (mobile && !wasDesktop) {
        setIsSidebarOpen(false);
      }
    };

    // Initial check
    checkMobile();

    // Add resize listener
    if (typeof window !== "undefined") {
      window.addEventListener("resize", checkMobile);
    }
    // cleanup
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", checkMobile);
      }
    };
  }, [isMobile]);

  // Recover data on mount - only run once
  useEffect(() => {
    const {
      messages,
      preferences: savedPrefs,
      conversationId: savedConvId,
    } = recoverData();
    if (messages.length > 0) {
      setInitialMessages(messages);
    }
    if (savedPrefs !== null) {
      updatePreferences(savedPrefs);
    }
    if (savedConvId !== null && savedConvId !== "") {
      setConversationId(savedConvId);
    }
    setIsRecovering(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - run only once on mount

  // Save preferences whenever they change
  useEffect(() => {
    if (!isRecovering) {
      savePreferences(preferences);
    }
  }, [preferences, isRecovering, savePreferences]);

  // Save session periodically
  useEffect(() => {
    const interval =
      typeof window !== "undefined"
        ? setInterval(() => {
            void saveSession(conversationId);
          }, 30000)
        : undefined; // Every 30 seconds

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [conversationId, saveSession]);

  if (isRecovering) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Recovering your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header with title and hamburger menu */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          {isMobile ? (
            <button
              aria-label="Toggle menu"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors md:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Bars3Icon className="w-6 h-6 text-gray-700" />
            </button>
          ) : null}
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold text-gray-900">
              Latest News Agent
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <NetworkStatus />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        {!isMobile && (
          <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
            <SidebarContent preferences={preferences} />
          </div>
        )}

        {/* Mobile drawer */}
        {isMobile ? (
          <Dialog
            className="relative z-50"
            open={isSidebarOpen}
            onClose={setIsSidebarOpen}
          >
            <DialogBackdrop
              transition
              className="fixed inset-0 bg-gray-500/75 transition-opacity duration-500 ease-in-out data-[closed]:opacity-0"
            />

            <div className="fixed inset-0 overflow-hidden">
              <div className="absolute inset-0 overflow-hidden">
                <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full pr-10">
                  <DialogPanel
                    transition
                    className="pointer-events-auto relative w-screen max-w-sm transform transition duration-500 ease-in-out data-[closed]:-translate-x-full"
                  >
                    <TransitionChild>
                      <div className="absolute top-0 right-0 -mr-8 flex pt-4 pl-2 duration-500 ease-in-out data-[closed]:opacity-0">
                        <button
                          className="relative rounded-md text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                          type="button"
                          onClick={() => setIsSidebarOpen(false)}
                        >
                          <span className="absolute -inset-2.5" />
                          <span className="sr-only">Close panel</span>
                          <XMarkIcon aria-hidden="true" className="size-6" />
                        </button>
                      </div>
                    </TransitionChild>
                    <div className="relative flex h-full flex-col overflow-y-auto bg-white py-6 shadow-xl">
                      <div className="px-4 sm:px-6">
                        <DialogTitle className="text-base font-semibold text-gray-900">
                          Preferences & Settings
                        </DialogTitle>
                      </div>
                      <div className="relative mt-6 flex-1 px-4 sm:px-6">
                        <SidebarContent preferences={preferences} />
                      </div>
                    </div>
                  </DialogPanel>
                </div>
              </div>
            </div>
          </Dialog>
        ) : null}

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          <OfflineFallback>
            <ChatInterface
              conversationId={conversationId}
              initialMessages={initialMessages}
              preferences={preferences}
              onPreferencesUpdate={updatePreferences}
            />
          </OfflineFallback>
        </div>
      </div>
    </div>
  );
}
