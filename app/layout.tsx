import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "./providers/QueryProvider";
import { ThemeProvider } from "./providers/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Integron - System Integrator Assistant",
  description: "Banking System Integrator management platform for BRI",
};

import DashboardLayout from "./components/DashboardLayout";

// ... (imports remain same)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased`}
      >
        <ThemeProvider>
          <QueryProvider>
            <DashboardLayout>
              {children}
            </DashboardLayout>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

