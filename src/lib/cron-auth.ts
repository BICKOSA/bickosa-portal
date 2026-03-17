export function isCronAuthorized(request: Request): boolean {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  if (authorization === `Bearer ${configuredSecret}` || authorization === configuredSecret) {
    return true;
  }

  const headerSecret = request.headers.get("x-cron-secret");
  return headerSecret === configuredSecret;
}
