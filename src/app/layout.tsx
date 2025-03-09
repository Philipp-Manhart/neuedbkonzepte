import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { UserProvider } from '@/lib/user-provider';
import { getSession } from '@/lib/session';
import { AuthToggle } from '@/components/auth-toggle';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Create Next App',
	description: 'Generated by create next app',
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const session = await getSession();
	const isAuthenticated = !!session?.userId;
	return (
		<html lang="en">
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased `}>
				<SidebarProvider>
					<AppSidebar />
					<SidebarInset>
						<UserProvider initialUser={session?.userId}>
							<div className="m-4">
								<header>
									<div className="flex justify-between items-center">
										<SidebarTrigger />

										<AuthToggle isAuthenticated={isAuthenticated} />
									</div>
								</header>
								<main>{children}</main>
							</div>
							<Toaster />
						</UserProvider>
					</SidebarInset>
				</SidebarProvider>
			</body>
		</html>
	);
}
