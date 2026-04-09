import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchLatestPosts } from "../lib/postsApi";
import PostCard from "./PostCard";
import { useI18n } from "../context/I18nContext";

function HomeLatestPostsSection() {
  const { t } = useI18n();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await fetchLatestPosts(4);
      if (!cancelled) {
        setPosts(data || []);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (!posts.length) return null;

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-white dark:bg-[#121a22] py-[24px] md:py-[12px]">
      <section className="page-section">
        <div className="container">
          <div className="mb-8 flex items-center justify-between gap-4">
            <h2 className="text-[28px] font-semibold text-[#103152] dark:text-[#e8ecf1]">
              {t("posts.latest")}
            </h2>

            <Link
              to="/posts"
              className="rounded-md bg-[#218c77] px-5 py-2.5 text-[18px] md:text-sm font-medium text-white hover:bg-[#1b7361]"
            >
              {t("posts.viewAll")}
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomeLatestPostsSection;