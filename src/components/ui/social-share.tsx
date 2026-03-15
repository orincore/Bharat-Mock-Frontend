"use client";

import { useState, useEffect } from 'react';
import { Share2, Facebook, Twitter, Linkedin, Copy, Mail, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SocialShareProps {
  url?: string;
  title: string;
  description?: string;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact';
}

export function SocialShare({ 
  url, 
  title, 
  description = '', 
  className = '',
  showLabel = true,
  size = 'md',
  variant = 'default'
}: SocialShareProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState(url || '');

  useEffect(() => {
    const raw = url || window.location.href;
    // Facebook and LinkedIn reject localhost URLs — swap in the production domain for sharing
    const normalized = raw.replace(/^https?:\/\/localhost(:\d+)?/, 'https://bharatmock.com');
    setShareUrl(normalized);
  }, [url]);

  const handleShare = async (platform: string) => {
    if (isSharing) return;
    setIsSharing(true);

    // Check if Web Share API is available and use it for native sharing
    if (platform === 'native' && navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: shareUrl,
        });
        return;
      } catch (error) {
        // User cancelled or sharing failed, fall back to other methods
        console.log('Native sharing cancelled or failed:', error);
      } finally {
        setIsSharing(false);
      }
    }
    
    try {
      switch (platform) {
        case 'twitter':
          // Updated Twitter/X sharing URL
          const twitterText = `${title} ${shareUrl}`;
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`, '_blank', 'noopener,noreferrer');
          break;
        case 'facebook':
          // Updated Facebook sharing URL with additional parameters
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(title)}`, '_blank', 'noopener,noreferrer');
          break;
        case 'linkedin':
          // Updated LinkedIn sharing URL with title and summary
          const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(description)}`;
          window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
          break;
        case 'email':
          // Email sharing
          const emailSubject = `Check out: ${title}`;
          const emailBody = `I thought you might be interested in this:\n\n${title}\n\n${description}\n\nRead more: ${shareUrl}`;
          window.open(`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`, '_self');
          break;
        case 'copy':
          // Copy to clipboard with better error handling
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(shareUrl);
            toast({
              title: 'Link copied!',
              description: 'Link copied to clipboard.',
            });
          } else {
            // Fallback for older browsers or non-HTTPS
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
              document.execCommand('copy');
              toast({
                title: 'Link copied!',
                description: 'Link copied to clipboard.',
              });
            } catch (err) {
              toast({
                title: 'Copy failed',
                description: 'Please copy the link manually from the address bar.',
                variant: 'destructive'
              });
            }
            textArea.remove();
          }
          break;
        case 'whatsapp':
          // WhatsApp sharing
          const whatsappText = `${title}\n\n${shareUrl}`;
          window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, '_blank', 'noopener,noreferrer');
          break;
        default:
          console.warn(`Unknown sharing platform: ${platform}`);
      }
    } catch (error) {
      console.error('Sharing failed:', error);
      toast({
        title: 'Sharing failed',
        description: 'Unable to share. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSharing(false);
    }
  };

  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-11 w-11'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const buttonSize = sizeClasses[size];
  const iconSize = iconSizes[size];

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showLabel && <span className="text-sm font-medium text-gray-700">Share:</span>}
        <div className="flex gap-1">
          <button
            onClick={() => handleShare('facebook')}
            className={`${buttonSize} rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors`}
            title="Share on Facebook"
            aria-label="Share on Facebook"
            disabled={isSharing}
          >
            <Facebook className={`${iconSize} text-white`} />
          </button>
          <button
            onClick={() => handleShare('twitter')}
            className={`${buttonSize} rounded-full bg-black hover:bg-gray-800 flex items-center justify-center transition-colors`}
            title="Share on X (Twitter)"
            aria-label="Share on X (Twitter)"
            disabled={isSharing}
          >
            <Twitter className={`${iconSize} text-white`} />
          </button>
          <button
            onClick={() => handleShare('linkedin')}
            className={`${buttonSize} rounded-full bg-blue-700 hover:bg-blue-800 flex items-center justify-center transition-colors`}
            title="Share on LinkedIn"
            aria-label="Share on LinkedIn"
            disabled={isSharing}
          >
            <Linkedin className={`${iconSize} text-white`} />
          </button>
          <button
            onClick={() => handleShare('copy')}
            className={`${buttonSize} rounded-full bg-gray-600 hover:bg-gray-700 flex items-center justify-center transition-colors`}
            title="Copy link"
            aria-label="Copy link"
            disabled={isSharing}
          >
            <Copy className={`${iconSize} text-white`} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {showLabel && <p className="text-sm font-semibold text-gray-900">Share this article</p>}
        <div className="flex flex-wrap gap-2">
          {/* Native share button for mobile devices */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              onClick={() => handleShare('native')}
              className="h-9 px-3 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center gap-2 transition-colors text-white text-sm font-medium sm:hidden"
              title="Share"
              aria-label="Share"
              disabled={isSharing}
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          )}
          
          {/* Individual platform buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleShare('facebook')}
              className={`${buttonSize} rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors`}
              title="Share on Facebook"
              aria-label="Share on Facebook"
              disabled={isSharing}
            >
              <Facebook className={`${iconSize} text-white`} />
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className={`${buttonSize} rounded-full bg-black hover:bg-gray-800 flex items-center justify-center transition-colors`}
              title="Share on X (Twitter)"
              aria-label="Share on X (Twitter)"
              disabled={isSharing}
            >
              <Twitter className={`${iconSize} text-white`} />
            </button>
            <button
              onClick={() => handleShare('linkedin')}
              className={`${buttonSize} rounded-full bg-blue-700 hover:bg-blue-800 flex items-center justify-center transition-colors`}
              title="Share on LinkedIn"
              aria-label="Share on LinkedIn"
              disabled={isSharing}
            >
              <Linkedin className={`${iconSize} text-white`} />
            </button>
            <button
              onClick={() => handleShare('whatsapp')}
              className={`${buttonSize} rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors`}
              title="Share on WhatsApp"
              aria-label="Share on WhatsApp"
              disabled={isSharing}
            >
              <MessageCircle className={`${iconSize} text-white`} />
            </button>
            <button
              onClick={() => handleShare('email')}
              className={`${buttonSize} rounded-full bg-gray-500 hover:bg-gray-600 flex items-center justify-center transition-colors`}
              title="Share via Email"
              aria-label="Share via Email"
              disabled={isSharing}
            >
              <Mail className={`${iconSize} text-white`} />
            </button>
            <button
              onClick={() => handleShare('copy')}
              className={`${buttonSize} rounded-full bg-gray-600 hover:bg-gray-700 flex items-center justify-center transition-colors`}
              title="Copy link"
              aria-label="Copy link"
              disabled={isSharing}
            >
              <Copy className={`${iconSize} text-white`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}