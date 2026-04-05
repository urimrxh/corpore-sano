import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPostsByTagSlug } from "../lib/postsApi";
import PostCard from "../components/PostCard";

function PostsByTagPage() {
  const { slug } = useParams();
  const [tag, setTag] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, tag: foundTag } = await fetchPostsByTagSlug(slug);
      if (!cancelled) {
        setTag(foundTag);
        setPosts(data || []);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <section className="page-section">
      <div className="container">
        <h1 className="mb-8 text-[32px] font-semibold text-[#103152] dark:text-[#e8ecf1]">
          {tag?.name || "Posts"}
        </h1>

        {loading ? (
          <p>Loading posts...</p>
        ) : !posts.length ? (
          <p>No posts found in this section.</p>
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