/**
 * @return {JSX.Element} site footer
 */
export function Footer() {
  return (
    <footer className="border-t border-border py-8 text-center text-sm text-muted">
      <p>
        &copy; {new Date().getFullYear()}&nbsp;Volt Store &middot; Built with Next.js,
        TailwindCSS &amp; Supabase.
      </p>
    </footer>
  );
}
