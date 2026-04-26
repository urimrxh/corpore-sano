import { useEffect, useState } from "react";
import { fetchPublishedPosts } from "../lib/postsApi";
import PostCard from "../components/PostCard";
import { useI18n } from "../context/I18nContext";
import Seo from "../components/Seo";

function PostsPage() {
  const { t } = useI18n();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await fetchPublishedPosts();
      if (!cancelled) {
        setPosts(data || []);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="page-section">
      <Seo
        title="Articles and Updates | Corpore Sano"
        description="Read articles and updates from Corpore Sano on nutrition, health, and wellbeing."
        path="/posts"
      />
      <div className="container">
        <h1 className="mb-8 text-[32px] font-semibold text-[#103152] dark:text-[#e8ecf1]">
          {t("posts.allPosts")}
        </h1>

        {loading ? (
          <p>{t("posts.loading")}</p>
        ) : !posts.length ? (
          <p>{t("posts.empty")}</p>
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

export default PostsPage;