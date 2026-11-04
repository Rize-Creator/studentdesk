import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const body = Atkinson_Hyperlegible({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "700"] });
const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudentDesk",
  description: "Plan CCDI events and capstone projects in one place, with suggestions for who to assign.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
