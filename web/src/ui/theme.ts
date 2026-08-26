import type { ThemeConfig } from "antd";

export const prismaTokens = {
  color: {
    primary: "#155eef",
    primaryHover: "#0b4ed9",
    navy: "#031531",
    navyDeep: "#020b1d",
    cyan: "#24b7f2",
    surface: "#ffffff",
    canvas: "#f5f7fb",
    border: "#e2e8f2",
    text: "#10203a",
    textSecondary: "#62708a",
    success: "#15945f",
    warning: "#d97706",
    danger: "#d92d20",
  },
  radius: {
    control: 8,
    card: 12,
  },
  layout: {
    sider: 320,
    siderCollapsed: 88,
    pageMax: 1680,
  },
} as const;

export const prismaTheme: ThemeConfig = {
  cssVar: { prefix: "prisma" },
  token: {
    colorPrimary: prismaTokens.color.primary,
    colorSuccess: prismaTokens.color.success,
    colorWarning: prismaTokens.color.warning,
    colorError: prismaTokens.color.danger,
    colorText: prismaTokens.color.text,
    colorTextSecondary: prismaTokens.color.textSecondary,
    colorBorder: prismaTokens.color.border,
    colorBgLayout: prismaTokens.color.canvas,
    colorBgContainer: prismaTokens.color.surface,
    borderRadius: prismaTokens.radius.control,
    borderRadiusLG: prismaTokens.radius.card,
    controlHeight: 36,
    fontFamily: '"Aptos", "Segoe UI Variable", "Segoe UI", sans-serif',
    fontSize: 14,
  },
  components: {
    Button: {
      primaryShadow: "none",
      fontWeight: 600,
    },
    Card: {
      headerBg: "transparent",
    },
    Layout: {
      bodyBg: prismaTokens.color.canvas,
      siderBg: prismaTokens.color.navy,
    },
    Menu: {
      darkItemBg: "transparent",
      darkItemColor: "rgba(255, 255, 255, 0.76)",
      darkItemHoverBg: "rgba(255, 255, 255, 0.08)",
      darkItemSelectedBg: prismaTokens.color.primary,
      darkItemSelectedColor: "#ffffff",
      itemBorderRadius: 9,
      itemHeight: 42,
      itemMarginBlock: 3,
      itemMarginInline: 10,
    },
  },
};
