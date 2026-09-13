import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App as AntApp, ConfigProvider } from "antd";
import { PrismaApplication } from "./app/PrismaApplication";
import ptBR from "antd/locale/pt_BR";
import { prismaTheme } from "./ui/theme";
import "antd/dist/reset.css";
import "./styles.css";
import "./ui/foundation.css";

const appElement = document.querySelector<HTMLDivElement>("#app");

if (!appElement) {
  throw new Error("Prisma web shell requires an #app element.");
}

createRoot(appElement).render(
  <StrictMode>
    <ConfigProvider theme={prismaTheme} locale={ptBR} form={{ validateMessages: { required: "Preencha este campo.", types: { email: "Informe um e-mail válido.", number: "Informe um número válido." } } }}>
      <AntApp>
        <PrismaApplication />
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
