import { Link, useLocation, useNavigate } from "react-router-dom";

const BOOK_CONSULTATION_ID = "book-consultation";

function scrollTargetIntoView() {
  document.getElementById(BOOK_CONSULTATION_ID)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

/**
 * Navigates to home + #book-consultation and scrolls to the hero (h1 + intro).
 * Hash-only client navigation does not always scroll reliably; we scroll after navigate.
 */
function BookConsultationLink({ className, children }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Link
      to={{ pathname: "/", hash: `#${BOOK_CONSULTATION_ID}` }}
      className={className}
      onClick={(e) => {
        e.preventDefault();

        const target = { pathname: "/", hash: `#${BOOK_CONSULTATION_ID}` };

        if (location.pathname === "/") {
          void navigate(target, { replace: true });
          queueMicrotask(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(scrollTargetIntoView);
            });
          });
          return;
        }

        void navigate(target);

        let attempts = 0;
        const maxAttempts = 45;
        let done = false;

        const tryScroll = () => {
          if (done) return;
          if (document.getElementById(BOOK_CONSULTATION_ID)) {
            done = true;
            scrollTargetIntoView();
            return;
          }
          if (attempts++ < maxAttempts) {
            requestAnimationFrame(tryScroll);
          }
        };

        requestAnimationFrame(tryScroll);
      }}
    >
      {children}
    </Link>
  );
}

export default BookConsultationLink;
