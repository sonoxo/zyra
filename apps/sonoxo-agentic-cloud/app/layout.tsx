import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Sonoxo Agentic Data Cloud",description:"A governed agentic social data warehouse for identity, content, engagement, commerce and intelligence.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
