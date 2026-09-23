// MSW can't intercept window.location.href, only fetch/XHR — so in dev,
// resolve the mocked redirect via fetch first, then navigate for real.
export async function navigateToBackendRedirect(
  path: string,
  devQuery = "",
): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    const res = await fetch(`${path}${devQuery}`);
    window.location.href = res.url;
    return;
  }
  window.location.href = `${process.env.NEXT_PUBLIC_API_URL}${path}`;
}
