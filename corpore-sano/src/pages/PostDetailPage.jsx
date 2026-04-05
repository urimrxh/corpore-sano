import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPostBySlug } from "../lib/postsApi";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function PostDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await fetchPostBySlug(slug);
      if (!cancelled) {
        setPost(data);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <section className="page-section">
        <div className="container">
          <p>Loading post...</p>
        </div>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="page-section">
        <div className="container">
          <p>Post not found.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="container max-w-4xl">
        {post.image_url ? (
          <img
            src={post.image_url}
            alt={post.title}
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
          {post.title}
        </h1>

        <div className="prose max-w-none dark:prose-invert">
          <p>{post.description}</p>
        </div>
      </div>
    </section>
  );
}

export default PostDetailPage;