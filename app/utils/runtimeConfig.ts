type RuntimeConfig = {
  docsUrl?: string;
  companyName?: string;
  updatedAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __layercodeRuntimeConfig: RuntimeConfig | undefined;
}

const getStore = (): RuntimeConfig => {
  if (!globalThis.__layercodeRuntimeConfig) {
    globalThis.__layercodeRuntimeConfig = { updatedAt: Date.now() };
  }
  return globalThis.__layercodeRuntimeConfig;
};

const cleanDocsUrl = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, '');
};

const cleanCompanyName = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed || undefined;
};

export const setRuntimeConfig = (values: { docsUrl?: string; companyName?: string }) => {
  const store = getStore();
  const docsUrl = cleanDocsUrl(values.docsUrl);
  const companyName = cleanCompanyName(values.companyName);

  if (docsUrl !== undefined) {
    store.docsUrl = docsUrl;
  }
  if (companyName !== undefined) {
    store.companyName = companyName;
  }
  store.updatedAt = Date.now();
};

export const getRuntimeConfig = () => {
  const store = getStore();
  return {
    docsUrl: store.docsUrl,
    companyName: store.companyName,
    updatedAt: store.updatedAt
  };
};
