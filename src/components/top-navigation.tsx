'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '~/components/ui/button';
import { ModeToggle } from '~/components/theme-toggle';
import { Github, Heart } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';

export function TopNavigation() {
    const { data: session, status } = useSession();

    return (
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                {/* Left side - Logo and title */}
                <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                    <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Snowy&apos;s Map Veto
                    </span>
                </Link>

                {/* Right side - Actions */}
                <div className="flex items-center space-x-3">
                    {/* Authentication */}
                    <div className="flex items-center space-x-2">
                        {status === 'loading' ? (
                            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                        ) : session?.user ? (
                            <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-2 text-sm">
                                    {session.user.image && (
                                        <Image
                                            src={session.user.image}
                                            alt={session.user.name ?? 'User'}
                                            width={24}
                                            height={24}
                                            className="rounded-full"
                                        />
                                    )}
                                    <span className="hidden sm:inline font-medium">
                                        {session.user.name}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => signOut()}
                                    className="text-xs"
                                >
                                    Sign Out
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => signIn('discord')}
                                className="text-xs"
                            >
                                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                                </svg>
                                Sign in with Discord
                            </Button>
                        )}
                    </div>

                    {/* GitHub Link */}
                    <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <Link
                            href="https://github.com/miekohikari/ayatori-veto"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center"
                        >
                            <Github className="h-4 w-4" />
                            <span className="sr-only">GitHub</span>
                        </Link>
                    </Button>

                    {/* Ko-fi Link */}
                    <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                        <Link
                            href="https://ko-fi.com/sn0_y"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center"
                        >
                            <Heart className="h-4 w-4" />
                            <span className="sr-only">Support on Ko-fi</span>
                        </Link>
                    </Button>

                    {/* Theme Toggle */}
                    <ModeToggle />
                </div>
            </div>
        </header>
    );
}
