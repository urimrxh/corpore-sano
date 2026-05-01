import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchPostBySlug,
  postDisplayContent,
  postDisplayDescription,
  postDisplayTitle,
} from "../lib/postsApi";
import { useI18n } from "../context/I18nContext";
import Seo, { SITE_NAME, resolveAbsoluteUrl } from "../components/Seo";
import { SEO_POSTS_DESCRIPTION, SEO_POSTS_TITLE } from "../seoCopy";

function buildArticleJsonLd(post, locale) {
  const headline = postDisplayTitle(post, locale);
  const description = postDisplayDescription(post, locale);
  if (!headline || description === "") return null;
  const imageUrl = post.image_url ? resolveAbsoluteUrl(post.image_url) : undefined;
  const author = post.author
    ? { "@type": "Person", "name": post.author }
    : { "@type": "Organization", "name": SITE_NAME };
  const publisher = {
    "@type": "Organization",
    name: SITE_NAME,
    logo: {
      "@type": "ImageObject",
      url: "https://corporesano-ks.com/logo.png",
    },
  };
  const o = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    author,
    publisher,
  };
  if (imageUrl) o.image = imageUrl;
  const pub = post.published_at || post.created_at;
  if (pub) o.datePublished = pub;
  if (post.updated_at) o.dateModified = post.updated_at;
  return o;
}

function PostDetailPage() {
  const { intlLocaleTag, locale, t } = useI18n();
  const { slug } = useParams();

  function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString(intlLocaleTag, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await fetchPostBySlug(slug);
      if (error) {
        console.error("[PostDetailPage] fetchPostBySlug", error.message || error);
      }
      if (!cancelled) {
        setPost(data);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const listFallbackSeo = (
    <Seo title={SEO_POSTS_TITLE} description={SEO_POSTS_DESCRIPTION} path={`/posts/${slug}`} />
  );

  const articleLd = useMemo(
    () => (post ? buildArticleJsonLd(post, locale) : null),
    [post, locale],
  );

  const displayTitle = post ? postDisplayTitle(post, locale) : "";
  const displayDescription = post ? postDisplayDescription(post, locale) : "";
  const displayContent = post ? postDisplayContent(post, locale) : "";

  if (loading) {
    return (
      <section className="page-section">
        {listFallbackSeo}
        <div className="container">
          <p>{t("posts.loadingOne")}</p>
        </div>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="page-section">
        {listFallbackSeo}
        <div className="container">
          <p>{t("posts.notFound")}</p>
        </div>
      </section>
    );
  }

  const seoImage = post.image_url ? resolveAbsoluteUrl(post.image_url) : undefined;
  const externalUrl = String(
    post.external_url || post.external_link || post.source_url || post.url || "",
  ).trim();
  const hasExternalUrl =
    externalUrl.startsWith("http://") || externalUrl.startsWith("https://");

  return (
    <section className="page-section">
      <Seo
        title={`${displayTitle} | ${SITE_NAME}`}
        description={displayDescription}
        path={`/posts/${slug}`}
        image={seoImage}
        type="article"
        jsonLd={articleLd || undefined}
      />
      <div className="container max-w-4xl">
        {post.image_url ? (
          <img
            src={post.image_url}
            alt={displayTitle}
            className="mb-8 h-[340px] w-full rounded-2xl object-cover"
          />
        ) : null}

        <p className="mb-2 text-sm text-[#4d515c] dark:text-[#b8c4d0]">
          {formatDate(post.published_at || post.created_at)}
          {post.author ? ` • ${post.author}` : ""}
        </p>

        {post.topic ? (
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#218c77] dark:text-[#4dc89f]">
            {post.topic}
          </p>
        ) : null}

        <h1 className="mb-6 text-[36px] font-semibold text-[#103152] dark:text-[#e8ecf1]">
          {displayTitle}
        </h1>

        <div className="prose max-w-none dark:prose-invert">
          <p>{displayDescription}</p>
          {displayContent ? (
            <div className="mt-4 whitespace-pre-wrap">{displayContent}</div>
          ) : null}
        </div>

        {hasExternalUrl ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center rounded-lg bg-[#218c77] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a745f] dark:bg-[#3aa57d] dark:hover:bg-[#32946f]"
          >
            {t("posts.visitExternal")}
          </a>
        ) : null}
      </div>
    </section>
  );
}

export default PostDetailPage;
