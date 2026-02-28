"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Menu, X, User, LogOut, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppData } from '@/context/AppDataContext';
import { LanguageSelector } from './LanguageSelector';

type NavigationItem = {
  label: string;
  href: string;
  open_in_new_tab?: boolean;
};

const renderNavLabel = (item: NavigationItem) => item.label;

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const { navigation: rawNavLinks, categories, subcategories, isLoading: loadingNav } = useAppData();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const navLinks: NavigationItem[] = useMemo(
    () =>
      (rawNavLinks || []).map((link) => ({
        label: link.label,
        href: link.href,
        open_in_new_tab: link.open_in_new_tab,
      })),
    [rawNavLinks]
  );

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const desktopNavItems = useMemo(() => navLinks, [navLinks]);

  const categoriesWithSubcategories = useMemo(() => {
    return categories.map(category => ({
      ...category,
      subcategories: subcategories.filter(sub => sub.category_id === category.id)
    }));
  }, [categories, subcategories]);

  const handleExploreMouseEnter = () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    setIsExploreOpen(true);
  };

  const handleExploreMouseLeave = () => {
    const timeout = setTimeout(() => {
      setIsExploreOpen(false);
      setHoveredCategoryId(null);
    }, 300);
    setCloseTimeout(timeout);
  };

  const currentCategorySubcategories = useMemo(() => {
    if (!hoveredCategoryId) return [];
    return subcategories.filter(sub => sub.category_id === hoveredCategoryId);
  }, [hoveredCategoryId, subcategories]);

  const currentCategory = useMemo(() => {
    if (!hoveredCategoryId) return null;
    return categories.find(cat => cat.id === hoveredCategoryId);
  }, [hoveredCategoryId, categories]);

  return (
    <nav className="sticky top-0 z-50 glass-effect border-b border-border/50">
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-12 w-44 sm:w-48 flex items-center">
              <Image
                src="/logo.png"
                alt="Bharat Mock Logo"
                fill
                sizes="(max-width: 768px) 180px, 200px"
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 min-h-[40px]">
            {loadingNav ? (
              Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={`nav-skel-${index}`} className="h-9 w-20 rounded-lg" />
              ))
            ) : (
              <>
                {/* Explore Exams Dropdown */}
                <div 
                  className="relative"
                  onMouseEnter={handleExploreMouseEnter}
                  onMouseLeave={handleExploreMouseLeave}
                >
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    Exams
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExploreOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isExploreOpen && categoriesWithSubcategories.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-border/60 rounded-xl shadow-2xl overflow-hidden z-50 animate-slide-down">
                      <div className="flex min-w-[700px] max-h-[500px]">
                        {/* Categories Column */}
                        <div className="w-1/3 bg-gray-50 border-r border-border/40 overflow-y-auto">
                          {categoriesWithSubcategories.map((category) => (
                            <div
                              key={category.id}
                              onMouseEnter={() => setHoveredCategoryId(category.id)}
                              className="relative"
                            >
                              <Link
                                href={`/${category.slug}`}
                                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-border/30 last:border-b-0 ${
                                  hoveredCategoryId === category.id
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-gray-700 hover:bg-primary/5 hover:text-primary'
                                }`}
                                onClick={() => {
                                  setIsExploreOpen(false);
                                  setHoveredCategoryId(null);
                                }}
                              >
                                <div className="h-10 w-10 rounded-xl bg-white border border-white/60 flex items-center justify-center overflow-hidden">
                                  {category.logo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={category.logo_url} alt={category.name} className="h-full w-full object-contain p-1.5" />
                                  ) : (
                                    <span className="text-xs font-bold text-gray-500">
                                      {category.name.slice(0, 3).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-sm leading-tight">{category.name}</p>
                                  <p className="text-xs text-gray-500">{category.subcategories.length} exams</p>
                                </div>
                              </Link>
                            </div>
                          ))}
                        </div>
                        
                        {/* Subcategories Column */}
                        <div className="w-2/3 p-4 overflow-y-auto bg-white">
                          {hoveredCategoryId && currentCategorySubcategories.length > 0 ? (
                            <>
                              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 px-2">
                                {currentCategory?.name}
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                {currentCategorySubcategories.map(sub => (
                                  <Link
                                    key={sub.id}
                                    href={`/${currentCategory?.slug}/${sub.slug}`}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors bg-white"
                                    onClick={() => {
                                      setIsExploreOpen(false);
                                      setHoveredCategoryId(null);
                                    }}
                                  >
                                    <div className="h-7 w-7 rounded-xl bg-slate-50 border border-border/40 flex items-center justify-center overflow-hidden">
                                      {sub.logo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={sub.logo_url} alt={sub.name} className="h-full w-full object-contain p-1" />
                                      ) : currentCategory?.logo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={currentCategory.logo_url} alt={currentCategory.name || ''} className="h-full w-full object-contain p-1" />
                                      ) : (
                                        <span className="text-[10px] font-semibold text-gray-500">
                                          {sub.name.slice(0, 2).toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    <span>{sub.name}</span>
                                  </Link>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-full text-sm text-gray-400">
                              Hover over a category to see exams
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Regular Navigation Items */}
                {desktopNavItems.map((item, index) => (
                  <Link
                    key={`${item.href}-${index}`}
                    href={item.href}
                    target={item.open_in_new_tab ? '_blank' : undefined}
                    rel={item.open_in_new_tab ? 'noopener noreferrer' : undefined}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </div>

          {/* Language Selector & Auth Section */}
          <div className="hidden md:flex items-center gap-2 min-w-[200px] justify-end">
            <LanguageSelector />
            {!hasMounted || isLoading ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            ) : isAuthenticated ? (
              <>
                {user?.role === 'admin' && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                  >
                    <Link href="/admin">Admin Dashboard</Link>
                  </Button>
                )}
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-11 w-11 rounded-full p-0">
                    <Avatar
                      className={`h-11 w-11 border-2 ${
                        user?.role === 'admin'
                          ? 'border-secondary/60 bg-secondary/15 text-secondary-foreground'
                          : 'border-primary/60 bg-primary/10 text-primary-foreground'
                      }`}
                    >
                      <AvatarImage src={user?.avatar_url} alt={user?.name} />
                      <AvatarFallback>
                        {user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-60 bg-white text-foreground border border-border/60 shadow-xl rounded-xl p-3"
                  align="end"
                  forceMount
                >
                  <div className="flex items-center gap-3 px-1 pb-3">
                    <Avatar
                      className={`h-9 w-9 border ${
                        user?.role === 'admin'
                          ? 'border-secondary/50 bg-secondary/15 text-secondary-foreground'
                          : 'border-primary/50 bg-primary/10 text-primary-foreground'
                      }`}
                    >
                      <AvatarImage src={user?.avatar_url} />
                      <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href="/profile" className="cursor-pointer flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href="/results" className="cursor-pointer flex items-center">
                      <FileText className="mr-2 h-4 w-4" />
                      My Results
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-destructive rounded-lg"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Sign up</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-slide-down">
          <div className="container-main py-4 space-y-2">
            {loadingNav
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={`mobile-nav-skel-${index}`} className="h-12 w-full rounded-lg" />
                ))
              : desktopNavItems.map((item, index) => (
                  <Link
                    key={`${item.href}-${index}`}
                    href={item.href}
                    target={item.open_in_new_tab ? '_blank' : undefined}
                    rel={item.open_in_new_tab ? 'noopener noreferrer' : undefined}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {renderNavLabel(item)}
                  </Link>
                ))}
            
            <div className="pt-4 border-t border-border space-y-2">
              {!hasMounted || isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ) : isAuthenticated ? (
                <>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-5 w-5" />
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-5 w-5" />
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block px-4 py-3 text-center rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Button asChild className="w-full">
                    <Link
                      href="/register"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign up
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
