import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App as AntApp, ConfigProvider } from "antd";
import { PrismaApplication } from "./app/PrismaApplication";
import { prismaTheme } from "./ui/theme";
import "antd/dist/reset.css";
import "./styles.css";

const appElement = document.querySelector<HTMLDivElement>("#app");

if (!appElement) {
  throw new Error("Prisma web shell requires an #app element.");
}

createRoot(appElement).render(
  <StrictMode>
    <ConfigProvider theme={prismaTheme}>
      <AntApp>
        <PrismaApplication />
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
