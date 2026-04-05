import { useEffect, useState } from "react";
import { fetchPublishedPosts } from "../lib/postsApi";
import PostCard from "../components/PostCard";

function PostsPage() {
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
      <div className="container">
        <h1 className="mb-8 text-[32px] font-semibold text-[#103152] dark:text-[#e8ecf1]">
          All posts
        </h1>

        {loading ? (
          <p>Loading posts...</p>
        ) : !posts.length ? (
          <p>No posts yet.</p>
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