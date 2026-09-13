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
    controlBorder: "#8291a5",
    text: "#10203a",
    textSecondary: "#53637d",
    success: "#117847",
    warning: "#955200",
    danger: "#d92d20",
  },
  radius: {
    control: 8,
    card: 12,
  },
  layout: {
    sider: 288,
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
    colorTextDescription: prismaTokens.color.textSecondary,
    colorTextPlaceholder: "#65738a",
    colorTextTertiary: prismaTokens.color.textSecondary,
    colorBorder: prismaTokens.color.controlBorder,
    colorBgLayout: prismaTokens.color.canvas,
    colorBgContainer: prismaTokens.color.surface,
    borderRadius: prismaTokens.radius.control,
    borderRadiusLG: prismaTokens.radius.card,
    controlHeight: 38,
    fontFamily: '"Aptos", "Segoe UI Variable", "Segoe UI", sans-serif',
    fontSize: 15,
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
