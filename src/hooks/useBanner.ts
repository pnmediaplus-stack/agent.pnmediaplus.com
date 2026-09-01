import useSWR from 'swr';

export function useBanner(setting_key: string) {
  const fetcher = (url: string) => fetch(url).then(r => r.json());
  const { data, error, mutate, isLoading } = useSWR<{ url: string | null; opacity?: number }>(
    `/api/settings/banner?setting_key=${setting_key}`,
    fetcher
  );

  return {
    bannerUrl: data?.url || null,
    opacity: data?.opacity ?? 100,
    isLoading,
    isError: error,
    mutate
  };
}
