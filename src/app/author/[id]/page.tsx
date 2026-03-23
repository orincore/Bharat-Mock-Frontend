"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, BookOpen, Edit2, Check, X, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/common/LoadingStates';
import { authService } from '@/lib/api/authService';
import { blogService, Blog } from '@/lib/api/blogService';
import { useAuth } from '@/context/AuthContext';
import { Breadcrumbs, HomeBreadcrumb } from '@/components/ui/breadcrumbs';
import { useToast } from '@/hooks/use-toast';
import { SocialShare } from '@/components/ui/social-share';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  editor: 'Editor',
  author: 'Author',
  user: 'Member',
};

const CAN_EDIT_ROLES = ['admin', 'editor', 'author'];

export default function AuthorPage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, updateProfile } = useAuth();
  const { toast } = useToast();

  const [author, setAuthor] = useState<{ id: string; name: string; avatar_url?: string; bio?: string; role: string; created_at: string; blog_count: number } | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Bio editing state
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  const isOwnProfile = currentUser?.id === id;
  const canEdit = isOwnProfile && CAN_EDIT_ROLES.includes(currentUser?.role || '');

  useEffect(() => {
    fetchAuthor();
    fetchBlogs();
  }, [id]);

  const fetchAuthor = async () => {
    setIsLoading(true);
    try {
      const data = await authService.getPublicProfile(id);
      setAuthor(data);
      setBioValue(data.bio || '');
    } catch {
      setError('Author not found');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBlogs = async () => {
    try {
      // fetch blogs by this author — use search by author_id if supported, else latest
      const res = await blogService.getBlogs({ limit: 12 });
      // filter client-side by author_id
      setBlogs(res.data.filter(b => b.author_id === id));
    } catch {}
  };

  const saveBio = async () => {
    setSavingBio(true);
    try {
      await updateProfile({ bio: bioValue } as any);
      setAuthor(prev => prev ? { ...prev, bio: bioValue } : prev);
      setEditingBio(false);
      toast({ title: 'Bio updated' });
    } catch {
      toast({ title: 'Failed to update bio', variant: 'destructive' });
    } finally {
      setSavingBio(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });

  const formatDateShort = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://bharatmock.com/author/${id}`;

  if (isLoading) return <LoadingPage message="Loading author..." />;

  if (error || !author) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container-home text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">{error || 'Author not found'}</h2>
          <Link href="/blogs"><Button>Back to Blogs</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 md:py-10">
        <div className="container-home">
          <Breadcrumbs
            items={[HomeBreadcrumb(), { label: 'Blogs', href: '/blogs' }, { label: author.name }]}
            variant="dark"
            className="mb-3 md:mb-4"
          />
          {/* Mobile: row layout with smaller avatar */}
          <div className="flex flex-row sm:flex-row items-start gap-3 md:gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {author.avatar_url
                ? <img src={author.avatar_url} alt={author.name} className="w-14 h-14 md:w-24 md:h-24 rounded-full object-cover border-4 border-white/30" />
                : <div className="w-14 h-14 md:w-24 md:h-24 rounded-full bg-white/20 flex items-center justify-center text-2xl md:text-3xl font-bold border-4 border-white/30">{author.name[0]}</div>
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                <h1 className="text-lg md:text-3xl font-bold leading-tight">{author.name}</h1>
                <span className="text-[10px] md:text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                  {ROLE_LABELS[author.role] || author.role}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4 text-xs md:text-sm text-blue-100 mt-0.5 md:mt-1">
                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3 md:h-3.5 md:w-3.5" />Joined {formatDate(author.created_at)}</span>
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3 md:h-3.5 md:w-3.5" />{author.blog_count} articles</span>
                </div>
                <SocialShare
                  title={`${author.name} — Author on BharatMock`}
                  description={author.bio}
                  url={shareUrl}
                  size="sm"
                  variant="compact"
                  showLabel={false}
                  className="[&_span]:text-white"
                />
              </div>

              {/* Bio */}
              <div className="mt-2 md:mt-3">
                {editingBio ? (
                  <div className="flex flex-col gap-2 max-w-xl">
                    <textarea
                      value={bioValue}
                      onChange={e => setBioValue(e.target.value)}
                      rows={3}
                      placeholder="Write a short bio..."
                      className="w-full bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-white/60 resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveBio} disabled={savingBio}
                        className="flex items-center gap-1 bg-white text-primary px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-white/90 transition disabled:opacity-60">
                        <Check className="h-3.5 w-3.5" />{savingBio ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => { setEditingBio(false); setBioValue(author.bio || ''); }}
                        className="flex items-center gap-1 bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-white/30 transition">
                        <X className="h-3.5 w-3.5" />Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="text-xs md:text-sm text-blue-100 max-w-xl leading-relaxed line-clamp-3 md:line-clamp-none">
                      {author.bio || (canEdit ? 'No bio yet. Click edit to add one.' : 'No bio available.')}
                    </p>
                    {canEdit && (
                      <button onClick={() => setEditingBio(true)}
                        className="flex-shrink-0 flex items-center gap-1 text-xs text-white/70 hover:text-white transition mt-0.5">
                        <Edit2 className="h-3.5 w-3.5" />Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Articles */}
      <div className="container-home py-4 md:py-8">
        <div className="flex items-center gap-3 mb-4 md:mb-5">
          <span className="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-sm">
            Articles by {author.name}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {blogs.length === 0 ? (
          <div className="py-12 md:py-16 text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 md:h-10 md:w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-sm md:text-base">No published articles yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {blogs.map(blog => (
              <Link key={blog.id} href={`/blogs/${blog.slug}`}
                className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 hover:shadow-md transition group flex sm:flex-col">
                {blog.featured_image_url && (
                  <div className="h-20 w-24 sm:w-auto sm:h-40 flex-shrink-0 overflow-hidden">
                    <img src={blog.featured_image_url} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="p-3 md:p-4 space-y-1 md:space-y-1.5 flex-1 min-w-0">
                  {blog.category && (
                    <span className="inline-block bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm">{blog.category}</span>
                  )}
                  <h3 className="font-bold text-foreground text-xs md:text-sm line-clamp-2 group-hover:text-primary transition leading-snug">{blog.title}</h3>
                  {blog.excerpt && <p className="hidden sm:block text-xs text-muted-foreground line-clamp-2">{blog.excerpt}</p>}
                  <p className="text-xs text-muted-foreground flex items-center gap-1 pt-0.5">
                    <Calendar className="h-3 w-3" />{formatDateShort(blog.published_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
