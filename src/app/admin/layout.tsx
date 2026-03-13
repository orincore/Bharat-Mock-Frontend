"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { getRolePermissions } from '@/lib/constants/adminRoles';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings,
  LogOut,
  BookOpen,
  FolderTree,
  PenSquare,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Home,
  PhoneCall,
  Layers,
  MessageSquareHeart,
  Sparkles
} from 'lucide-react';

const adminNavItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: null },
  { name: 'Exams', href: '/admin/exams', icon: FileText, permission: 'canAccessExams' },
  { name: 'Categories', href: '/admin/categories', icon: FolderTree, permission: 'canAccessCategories' },
  { name: 'Blogs', href: '/admin/blogs', icon: PenSquare, permission: 'canAccessBlogs' },
  { name: 'Pages', href: '/admin/pages', icon: Layers, permission: 'canAccessPages' },
  { name: 'Current Affairs', href: '/admin/current-affairs', icon: Sparkles, permission: 'canAccessPages' },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard, permission: 'canAccessSubscriptions' },
  { name: 'Contact', href: '/admin/contact', icon: PhoneCall, permission: 'canAccessContact' },
  { name: 'Testimonials', href: '/admin/testimonials', icon: MessageSquareHeart, permission: 'canAccessTestimonials' },
  { name: 'Users', href: '/admin/users', icon: Users, permission: 'canAccessUsers' },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const userRole = user?.role || 'user';
  const permissions = useMemo(() => getRolePermissions(userRole), [userRole]);

  const filteredNavItems = useMemo(() => {
    return adminNavItems.filter(item => {
      if (!item.permission) return true;
      return permissions[item.permission as keyof typeof permissions];
    });
  }, [permissions]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!['admin', 'editor', 'author'].includes(user?.role || '')) {
        router.push('/');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (!hasMounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated || !['admin', 'editor', 'author'].includes(user?.role || '')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${navCollapsed ? 'w-20' : 'w-64'} bg-card border-r border-border min-h-screen sticky top-0 transition-all duration-200 relative`}
        >
          <button
            type="button"
            onClick={() => setNavCollapsed((prev) => !prev)}
            className="absolute -right-3 top-12 z-10 p-2 rounded-full border border-border bg-card shadow hover:bg-muted transition-colors"
            aria-label={navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {navCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <Link href="/admin" className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-secondary-foreground" />
                </div>
                {!navCollapsed && (
                  <div>
                    <h1 className="font-display text-lg font-bold text-foreground">Admin Panel</h1>
                    <p className="text-xs text-muted-foreground">Bharat Mock</p>
                  </div>
                )}
              </Link>
            </div>

            <nav className="space-y-1 flex-1">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <item.icon className="h-5 w-5" />
                  {!navCollapsed && <span>{item.name}</span>}
                </Link>
              ))}
            </nav>

            <div className="pt-6 border-t border-border space-y-2">
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <LayoutDashboard className="h-5 w-5" />
                {!navCollapsed && <span>Back to Site</span>}
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
              >
                <LogOut className="h-5 w-5" />
                {!navCollapsed && <span>Logout</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
