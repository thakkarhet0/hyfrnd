let _initPromise: Promise<void> | null = null;

const createChainableMock = (targetVal: any = []): any => {
  const proxy: any = new Proxy(() => {}, {
    get(target, prop, receiver) {
      if (prop === 'then') {
        return (onFulfilled: any) => Promise.resolve(targetVal).then(onFulfilled);
      }
      if (prop === 'catch') {
        return (onRejected: any) => Promise.resolve(targetVal).catch(onRejected);
      }
      if (prop === 'transaction') {
        return async (cb: (tx: any) => Promise<any>) => {
          return await cb(proxy);
        };
      }
      return createChainableMock(targetVal);
    },
    apply(target, thisArg, argumentsList) {
      return proxy;
    },
  });
  return proxy;
};

const mockDb = createChainableMock([]);

export function initializeDatabase(): Promise<void> {
  if (_initPromise !== null) return _initPromise;
  _initPromise = Promise.resolve();
  return _initPromise;
}

export function getDb(): any {
  return mockDb;
}
