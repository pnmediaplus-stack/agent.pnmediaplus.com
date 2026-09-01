import useSWR from 'swr';

export function useBanner(setting_key: string) {
  const fetcher = (url: string) => fetch(url).then(r => r.json());
  const { data, error, mutate, isLoading } = useSWR<{ url: string | null }>(
    `/api/settings/banner?setting_key=${setting_key}`,
    fetcher
  );

  return {
    bannerUrl: data?.url || null,
    isLoading,
    isError: error,
    mutate
  };
}
