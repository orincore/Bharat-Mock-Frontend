interface ServerBlogDetailProps {
  article: any;
  sections: any[];
  relatedArticles: any[];
  categories: string[];
}

export default function ServerBlogDetail({ article, sections, relatedArticles, categories }: ServerBlogDetailProps) {
  return (
    <>
      {/* ── Static HTML for Google indexing ─────────────────────────────── */}
      <div className="sr-only" aria-hidden="false">
        <h1 dangerouslySetInnerHTML={{ __html: article.title }} />
        {article.excerpt && <p dangerouslySetInnerHTML={{ __html: article.excerpt }} />}
        {article.meta_description && <p dangerouslySetInnerHTML={{ __html: article.meta_description }} />}
        
        {article.author?.name && (
          <section>
            <h2>Author</h2>
            <p>{article.author.name}</p>
          </section>
        )}
        
        {article.category && (
          <section>
            <h2>Category</h2>
            <p>{article.category}</p>
          </section>
        )}
        
        {article.published_at && (
          <section>
            <h2>Published Date</h2>
            <p>{article.published_at}</p>
          </section>
        )}
        
        {sections.length > 0 && (
          <section>
            <h2>Content Sections</h2>
            <ul>
              {sections.slice(0, 10).map((section: any, i: number) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: section.title || section.section_key || 'Section' }} />
              ))}
            </ul>
          </section>
        )}
        
        {relatedArticles.length > 0 && (
          <section>
            <h2>Related Articles</h2>
            <ul>
              {relatedArticles.map((related: any, i: number) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: related.title }} />
              ))}
            </ul>
          </section>
        )}
        
        {categories.length > 0 && (
          <section>
            <h2>Blog Categories</h2>
            <ul>
              {categories.map((cat: string, i: number) => (
                <li key={i}>{cat}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
