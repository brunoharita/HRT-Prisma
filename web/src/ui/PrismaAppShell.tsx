import { useEffect, useState, type ReactNode } from "react";
import {
  BankOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  DownOutlined,
  LogoutOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Drawer, Dropdown, Layout, Menu, Select, Tooltip } from "antd";
import type { MenuProps } from "antd";
import type { OrganizationMembership } from "../shared/access";
import darkBackgroundLogo from "../assets/brand/prisma-logo-dark-background.png";
import { prismaTokens } from "./theme";

export interface PrismaNavigationItem {
  path: string;
  label: string;
  icon: ReactNode;
}

interface PrismaAppShellProps {
  children: ReactNode;
  navigationItems: PrismaNavigationItem[];
  selectedPath: string;
  memberships: OrganizationMembership[];
  activeMembership: OrganizationMembership | null;
  profileName: string;
  profileSubtitle: string;
  onNavigate: (path: string) => void;
  onOrganizationChange: (organizationId: string) => void;
  onSignOut: () => void;
}

interface SidebarContentProps extends Omit<PrismaAppShellProps, "children"> {
  collapsed: boolean;
  mobile: boolean;
  onCollapse: () => void;
  onNavigationComplete?: () => void;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQuery.matches);
    updateMatches();
    mediaQuery.addEventListener("change", updateMatches);
    return () => mediaQuery.removeEventListener("change", updateMatches);
  }, [query]);

  return matches;
}

function SidebarContent({
  navigationItems,
  selectedPath,
  memberships,
  activeMembership,
  profileName,
  profileSubtitle,
  onNavigate,
  onOrganizationChange,
  onSignOut,
  collapsed,
  mobile,
  onCollapse,
  onNavigationComplete,
}: SidebarContentProps) {
  const navigationMenuItems: MenuProps["items"] = navigationItems.map((item) => ({
    key: item.path,
    icon: item.icon,
    label: (
      <a
        href={item.path}
        onClick={(event) => {
          event.preventDefault();
          onNavigate(item.path);
          onNavigationComplete?.();
        }}
      >
        {item.label}
      </a>
    ),
  }));

  const membershipMenuItems: MenuProps["items"] = memberships.map((membership) => ({
    key: membership.organizationId,
    label: membership.organizationName,
  }));

  const profileMenuItems: MenuProps["items"] = [
    {
      key: "sign-out",
      danger: true,
      icon: <LogoutOutlined />,
      label: "Sair",
    },
  ];

  return (
    <div className="prisma-sidebar-inner">
      <div className={["prisma-brand", collapsed ? "is-collapsed" : ""].join(" ")}>
        <a href="/" aria-label="Ir para o início" onClick={(event) => {
          event.preventDefault();
          onNavigate("/");
          onNavigationComplete?.();
        }}>
          <img src={darkBackgroundLogo} alt="Prisma" />
        </a>
        {!mobile ? (
          <Tooltip title={collapsed ? "Expandir menu" : "Recolher menu"} placement="right">
            <Button
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              className="prisma-sidebar-collapse"
              icon={collapsed ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
              onClick={onCollapse}
              shape="circle"
              size="small"
              type="text"
            />
          </Tooltip>
        ) : null}
      </div>

      <nav className="prisma-navigation" aria-label="Navegação principal">
        <Menu
          inlineCollapsed={collapsed}
          items={navigationMenuItems}
          mode="inline"
          selectedKeys={[selectedPath]}
          theme="dark"
        />
      </nav>

      <div className="prisma-sidebar-utilities">
        {memberships.length > 0 ? (
          collapsed ? (
            <Dropdown
              menu={{
                items: membershipMenuItems,
                selectedKeys: activeMembership ? [activeMembership.organizationId] : [],
                onClick: ({ key }) => onOrganizationChange(key),
              }}
              placement="topLeft"
              trigger={["click"]}
            >
              <Button
                aria-label="Trocar organização"
                className="prisma-sidebar-icon-button"
                icon={<BankOutlined />}
                type="text"
              />
            </Dropdown>
          ) : (
            <div className="prisma-organization-control">
              <label htmlFor="prisma-organization">Empresa ativa</label>
              <Select
                id="prisma-organization"
                aria-label="Empresa ativa"
                onChange={onOrganizationChange}
                options={memberships.map((membership) => ({
                  label: membership.organizationName,
                  value: membership.organizationId,
                }))}
                suffixIcon={<DownOutlined />}
                value={activeMembership?.organizationId ?? null}
              />
            </div>
          )
        ) : null}

        <div className="prisma-sidebar-divider" />

        <Dropdown
          menu={{
            items: profileMenuItems,
            onClick: ({ key }) => {
              if (key === "sign-out") onSignOut();
            },
          }}
          placement="topLeft"
          trigger={["click"]}
        >
          <button className={["prisma-user-menu", collapsed ? "is-collapsed" : ""].join(" ")} type="button">
            <Avatar className="prisma-user-avatar" size={36}>
              {profileName.slice(0, 1).toUpperCase()}
            </Avatar>
            {!collapsed ? (
              <>
                <span className="prisma-user-copy">
                  <strong>{profileName}</strong>
                  <small>{profileSubtitle}</small>
                </span>
                <DownOutlined className="prisma-user-chevron" />
              </>
            ) : null}
          </button>
        </Dropdown>
      </div>
    </div>
  );
}

export function PrismaAppShell(props: PrismaAppShellProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isCompactDesktop = useMediaQuery("(min-width: 768px) and (max-width: 1180px)");
  const [collapsed, setCollapsed] = useState(isCompactDesktop);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isCompactDesktop) setCollapsed(true);
  }, [isCompactDesktop]);

  const siderWidth = collapsed ? prismaTokens.layout.siderCollapsed : prismaTokens.layout.sider;

  return (
    <Layout className="prisma-app-shell">
      {!isMobile ? (
        <Layout.Sider
          className="prisma-sidebar"
          collapsed={collapsed}
          collapsedWidth={prismaTokens.layout.siderCollapsed}
          trigger={null}
          width={prismaTokens.layout.sider}
        >
          <SidebarContent
            {...props}
            collapsed={collapsed}
            mobile={false}
            onCollapse={() => setCollapsed((value) => !value)}
          />
        </Layout.Sider>
      ) : (
        <>
          <Button
            aria-label="Abrir navegação"
            className="prisma-mobile-navigation-trigger"
            icon={<MenuOutlined />}
            onClick={() => setMobileOpen(true)}
            shape="circle"
            size="large"
          />
          <Drawer
            className="prisma-mobile-drawer"
            closeIcon={null}
            onClose={() => setMobileOpen(false)}
            open={mobileOpen}
            placement="left"
            styles={{ body: { padding: 0 } }}
            size={Math.min(prismaTokens.layout.sider, window.innerWidth - 32)}
          >
            <SidebarContent
              {...props}
              collapsed={false}
              mobile
              onCollapse={() => undefined}
              onNavigationComplete={() => setMobileOpen(false)}
            />
          </Drawer>
        </>
      )}

      <Layout className="prisma-main-layout" style={{ marginLeft: isMobile ? 0 : siderWidth }}>
        <Layout.Content className="prisma-main-content">{props.children}</Layout.Content>
      </Layout>
    </Layout>
  );
}
