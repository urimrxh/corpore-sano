import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchChildTagsForParent,
  fetchPostsForTagArchive,
  tagDisplayTitle,
} from "../lib/postsApi";
import PostCard from "../components/PostCard";
import { useI18n } from "../context/I18nContext";
import Seo, { SITE_NAME } from "../components/Seo";
import { SEO_POSTS_DESCRIPTION, SEO_POSTS_TITLE } from "../seoCopy";
import "../style/tagArchiveNav.css";

function PostsByTagPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const parentSlug = params.subSlug ? params.parentSlug : params.slug;
  const subSlug = params.subSlug || null;

  const [tag, setTag] = useState(null);
  const [parentTag, setParentTag] = useState(null);
  const [subTag, setSubTag] = useState(null);
  const [posts, setPosts] = useState([]);
  const [childTags, setChildTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);
      const result = await fetchPostsForTagArchive(parentSlug, subSlug);
      if (cancelled) return;
      if (result.error && !result.tag) {
        setLoadError(result.error);
      } else {
        setLoadError(null);
      }
      setTag(result.tag);
      setParentTag(result.parentTag);
      setSubTag(result.subTag);
      setPosts(result.data || []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [parentSlug, subSlug]);

  const subnavParent = useMemo(() => {
    if (parentTag && !parentTag.parent_id) return parentTag;
    if (tag && !tag.parent_id) return tag;
    return parentTag && !parentTag.parent_id ? parentTag : null;
  }, [parentTag, tag]);

  useEffect(() => {
    let cancelled = false;
    if (!subnavParent?.id) {
      setChildTags([]);
      return undefined;
    }
    (async () => {
      const { data } = await fetchChildTagsForParent(subnavParent.id);
      if (!cancelled) setChildTags(data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [subnavParent?.id]);

  const heading = tagDisplayTitle(subTag || tag, locale);
  const tagTitle = heading ? `${heading} | ${SITE_NAME}` : SEO_POSTS_TITLE;

  const seoPath = subSlug
    ? `/posts/tag/${parentSlug}/${subSlug}`
    : `/posts/tag/${parentSlug}`;

  const isParentArchiveView = Boolean(
    subSlug == null && tag && parentTag && tag.id === parentTag.id,
  );

  const showSubnav = subnavParent && childTags.length > 0;

  return (
    <section className="page-section">
      <Seo
        title={tagTitle}
        description={SEO_POSTS_DESCRIPTION}
        path={seoPath}
      />
      <div className="container">
        <h1 className="mb-4 text-[32px] font-semibold text-[#103152] dark:text-[#e8ecf1]">
          {heading || t("posts.fallbackTagTitle")}
        </h1>

        {showSubnav ? (
          <nav
            className="tag-archive-subnav"
            aria-label={t("posts.tagSubnavAria")}
          >
            <Link
              to={`/posts/tag/${subnavParent.slug}`}
              className={`tag-archive-subnav__link${isParentArchiveView ? " tag-archive-subnav__link--active" : ""}`}
            >
              {t("posts.tagSubnavAll")}
            </Link>
            {childTags.map((c) => {
              const active =
                (subTag && subTag.id === c.id) ||
                (!isParentArchiveView && tag?.id === c.id);
              return (
                <Link
                  key={c.id}
                  to={`/posts/tag/${subnavParent.slug}/${c.slug}`}
                  className={`tag-archive-subnav__link${active ? " tag-archive-subnav__link--active" : ""}`}
                >
                  {tagDisplayTitle(c, locale)}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {loading ? (
          <p>{t("posts.loading")}</p>
        ) : loadError && !tag ? (
          <p role="alert">{t("posts.notFound")}</p>
        ) : !posts.length ? (
          <p>{t("posts.emptyTag")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default PostsByTagPage;
