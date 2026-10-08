import type { Metadata } from "next";
import { ThemeProvider } from "../components/theme/ThemeProvider";
import "./globals.css";
import "./profile.css";
import "./native-profile.css";

export const metadata: Metadata = {
  title: "AIBOX — The future of the photobooth",
  description: "Meet MagicBooth: the AI photobooth experience built for touch-free capture, beautiful prints, and effortless sharing.",
  icons: { icon: "/favicon.png", apple: "/favicon.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
