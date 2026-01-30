"use client";

import { Article } from '@/types';
import { Blog } from '@/lib/api/blogService';
import Link from 'next/link';
import { Clock, Eye, ArrowRight, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type ArticleLike = Article | Blog;

const getPublishedDate = (article: ArticleLike) => article.published_at || article.created_at || (article as Blog).updated_at;

const getCoverImage = (article: ArticleLike) =>
  (article as Article).image_url || (article as Blog).featured_image_url || '/placeholder.svg';

const getAuthorMeta = (article: ArticleLike) => {
  const articleAuthor = (article as Article).author;
  const blogAuthor = (article as Blog).author;

  if (articleAuthor) {
    return {
      name: articleAuthor.name || 'Editorial Team',
      avatar: articleAuthor.avatar_url,
      bio: articleAuthor.bio || 'Bharat Mock Expert'
    };
  }

  const rawMeta = blogAuthor?.raw_user_meta_data || {};
  return {
    name: rawMeta.name || 'Editorial Team',
    avatar: rawMeta.avatar_url,
    bio: rawMeta.bio || 'Bharat Mock Expert'
  };
};

interface ArticleCardProps {
  article: ArticleLike;
  variant?: 'default' | 'featured';
}

export function ArticleCard({ article, variant = 'default' }: ArticleCardProps) {
  const publishedAt = getPublishedDate(article);
  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '—';

  const coverImage = getCoverImage(article);
  const readTime = article.read_time ?? 0;
  const authorMeta = getAuthorMeta(article);
  const authorInitial = authorMeta.name.charAt(0).toUpperCase();
  const views = (article as Article).views ?? (article as Blog).view_count;
  const category = article.category || 'General';
  const excerpt = article.excerpt || '';
  const slug = article.slug;

  if (variant === 'featured') {
    return (
      <Link href={`/blogs/${slug}`} className="group">
        <div className="card-interactive overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="relative h-64 md:h-full overflow-hidden">
              <img
                src={coverImage}
                alt={article.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-foreground/20 to-transparent" />
            </div>
            
            <div className="p-6 md:p-8 flex flex-col justify-center">
              <Badge className="w-fit mb-4 bg-primary/10 text-primary">
                {category}
              </Badge>
              
              <h3 className="font-display font-bold text-2xl text-foreground mb-3 group-hover:text-primary transition-colors">
                {article.title}
              </h3>
              
              <p className="text-muted-foreground mb-4 line-clamp-3">
                {excerpt}
              </p>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{readTime} min read</span>
                </div>
                {views && (
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{views.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={authorMeta.avatar} />
                  <AvatarFallback>{authorInitial}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{authorMeta.name}</p>
                  <p className="text-xs text-muted-foreground">{authorMeta.bio}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/blogs/${slug}`} className="group">
      <div className="card-interactive overflow-hidden h-full flex flex-col">
        <div className="relative h-48 overflow-hidden">
          <img
            src={coverImage}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute top-3 left-3">
            <Badge className="bg-primary/90 text-primary-foreground">
              {category}
            </Badge>
          </div>
        </div>
        
        <div className="p-5 flex flex-col flex-grow">
          <h3 className="font-display font-semibold text-lg text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">
            {excerpt}
          </p>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={authorMeta.avatar} />
                <AvatarFallback>{authorInitial}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">{authorMeta.name}</span>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formattedDate}</span>
              <span>•</span>
              <span>{readTime} min</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
