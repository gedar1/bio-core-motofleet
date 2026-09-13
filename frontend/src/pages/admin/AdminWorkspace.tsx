import React from "react";
import { useSearchParams } from "react-router-dom";
import { AdminDesktopNav } from "./workspace/AdminDesktopNav";
import { AdminMobileDrawer } from "./workspace/AdminMobileDrawer";
import { AdminMobileHeader } from "./workspace/AdminMobileHeader";
import { AdminWorkspaceContent } from "./workspace/AdminWorkspaceContent";
import { adminNavItems } from "./workspace/workspaceConfig";

export const AdminWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const mode = searchParams.get("mode");
  const editId = searchParams.get("id");
  const [isMobileNavOpen, setMobileNavOpen] = React.useState(false);

  const activeItem =
    adminNavItems.find((item) => item.id === activeTab) ?? adminNavItems[0];

  const navigateToTab = (tabId: string, createMode = false) => {
    const params = new URLSearchParams();
    params.set("tab", tabId);
    if (createMode) {
      params.set("mode", "create");
    }
    setSearchParams(params);
    setMobileNavOpen(false);
  };

  const goBack = () => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    setSearchParams(params);
  };

  return (
    <div className="flex w-full min-h-[calc(100vh-64px)]">
      <AdminDesktopNav
        items={adminNavItems}
        activeTab={activeTab}
        onNavigate={navigateToTab}
      />
      <AdminMobileDrawer
        isOpen={isMobileNavOpen}
        items={adminNavItems}
        activeTab={activeTab}
        onClose={() => setMobileNavOpen(false)}
        onNavigate={navigateToTab}
      />

      <div className="min-w-0 w-full flex-1">
        <AdminMobileHeader
          activeLabel={activeItem.label}
          onOpen={() => setMobileNavOpen(true)}
        />
        <div className="w-full">
          <div className="w-full min-h-[400px] rounded-lg bg-surface">
            <AdminWorkspaceContent
              activeTab={activeTab}
              mode={mode}
              editId={editId}
              onBack={goBack}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminWorkspace;
