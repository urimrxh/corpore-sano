import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";

function PostCard({ post }) {
  const { intlLocaleTag, t } = useI18n();

  function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString(intlLocaleTag, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <Link
      to={`/posts/${post.slug}`}
      className="block hover:translate-y-[-5px] transition-all duration-300 hover:brightness-[0.95]"
    >
      <article className="overflow-hidden rounded-2xl border border-[#e1e5ec] bg-[#f5f8fa] shadow-sm dark:border-[#2a3441] dark:bg-[#1a2332]">
        {post.image_url ? (
          <img
            src={post.image_url}
            alt={post.title}
            className="h-52 w-full object-cover"
          />
        ) : null}

        <div className="p-5">
          <p className="mb-2 text-sm text-[#4d515c] dark:text-[#b8c4d0]">
            {formatDate(post.published_at || post.created_at)}
            {post.author ? ` • ${post.author}` : ""}
          </p>

          {post.topic ? (
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#218c77] dark:text-[#4dc89f]">
              {post.topic}
            </p>
          ) : null}

          <h3 className="mb-2 text-xl font-semibold text-[#103152] dark:text-[#e8ecf1]">
            {post.title}
          </h3>

          <p className="mb-4 text-sm text-[#4d515c] dark:text-[#b8c4d0]">
            {post.description}
          </p>

          <span className="inline-flex items-center text-sm font-medium text-[#218c77] underline dark:text-[#4dc89f]">
            {t("posts.readMore")}
          </span>
        </div>
      </article>
    </Link>
  );
}

export default PostCard;