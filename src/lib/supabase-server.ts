type SupabaseRpcParams = {
  [key: string]: any;
};

type SupabaseClient = {
  rpc: (functionName: string, params?: SupabaseRpcParams) => Promise<{ data: any; error: any }>;
  from: (tableName: string) => {
    select: (query: string) => any;
    insert: (values: any) => any;
    update: (values: any) => any;
    upsert: (values: any) => any;
    delete: () => any;
    eq: (column: string, value: any) => any;
    order: (column: string, options?: { ascending?: boolean }) => any;
    limit: (count: number) => any;
    maybeSingle: () => Promise<{ data: any; error: any }>;
    single: () => Promise<{ data: any; error: any }>;
  };
  schema: (schemaName: string) => {
    from: (tableName: string) => {
      select: (query: string) => any;
      insert: (values: any) => any;
      update: (values: any) => any;
      upsert: (values: any) => any;
      delete: () => any;
      eq: (column: string, value: any) => any;
      order: (column: string, options?: { ascending?: boolean }) => any;
      limit: (count: number) => any;
      maybeSingle: () => Promise<{ data: any; error: any }>;
      single: () => Promise<{ data: any; error: any }>;
    };
  };
};

export function createServiceRoleClient(): SupabaseClient {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

  if (!supabaseUrl || !serviceKey) {
    throw new Error("SUPABASE_CONFIG_MISSING");
  }

  const defaultHeaders = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json'
  };

  const client = {
    rpc: async (functionName: string, params?: SupabaseRpcParams) => {
      let targetFunction = functionName;
      let targetSchema = '';
      if (functionName.includes('.')) {
        [targetSchema, targetFunction] = functionName.split('.');
      }

      try {
        const headers: any = { ...defaultHeaders };
        if (targetSchema) {
          headers['Accept-Profile'] = targetSchema;
          headers['Content-Profile'] = targetSchema;
        }

        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${targetFunction}`, {
          method: 'POST',
          headers,
          body: params ? JSON.stringify(params) : undefined
        });

        if (!response.ok) {
          const text = await response.text();
          return { data: null, error: new Error(`RPC_ERROR: ${response.status} - ${text}`) };
        }

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        return { data, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    from: (tableName: string) => {
      let targetTable = tableName;
      let targetSchema = '';
      if (tableName.includes('.')) {
        [targetSchema, targetTable] = tableName.split('.');
      }

      const queryBuilder = {
        _select: '',
        _filters: [] as string[],
        _order: '',
        _limit: '',
        _single: false,
        _operation: '',
        _values: undefined as any,
        select: (query: string) => {
          queryBuilder._select = query;
          return queryBuilder;
        },
        insert: (values: any) => {
          queryBuilder._operation = "insert";
          queryBuilder._values = values;
          return queryBuilder;
        },
        update: (values: any) => {
          queryBuilder._operation = "update";
          queryBuilder._values = values;
          return queryBuilder;
        },
        upsert: (values: any) => {
          queryBuilder._operation = "upsert";
          queryBuilder._values = values;
          return queryBuilder;
        },
        delete: () => {
          queryBuilder._operation = "delete";
          return queryBuilder;
        },
        eq: (column: string, value: any) => {
          queryBuilder._filters.push(`${column}=eq.${encodeURIComponent(value)}`);
          return queryBuilder;
        },
        order: (column: string, options?: { ascending?: boolean }) => {
          queryBuilder._order = `${column}.${options?.ascending === false ? 'desc' : 'asc'}`;
          return queryBuilder;
        },
        limit: (count: number) => {
          queryBuilder._limit = String(count);
          return queryBuilder;
        },
        single: async () => {
          queryBuilder._single = true;
          const url = new URL(`${supabaseUrl}/rest/v1/${targetTable}`);
          if (queryBuilder._select) url.searchParams.set('select', queryBuilder._select);
          queryBuilder._filters.forEach(f => {
            const [k, v] = f.split('=');
            url.searchParams.set(k, v);
          });
          if (queryBuilder._order) url.searchParams.set('order', queryBuilder._order);
          if (queryBuilder._limit) url.searchParams.set('limit', queryBuilder._limit);

          const headers: any = { ...defaultHeaders };
          if (targetSchema) {
            headers['Accept-Profile'] = targetSchema;
            headers['Content-Profile'] = targetSchema;
          }
          if (queryBuilder._single) {
            headers['Accept'] = 'application/vnd.pgrst.object+json';
          }
          if (queryBuilder._operation && queryBuilder._select) {
            headers['Prefer'] = 'return=representation';
          }

          const response = await fetch(url.toString(), {
            method: queryBuilder._operation ? (queryBuilder._operation === 'insert' ? 'POST' : queryBuilder._operation === 'delete' ? 'DELETE' : 'PATCH') : 'GET',
            headers,
            body: queryBuilder._values ? JSON.stringify(queryBuilder._values) : undefined
          });

          if (!response.ok) {
             if (response.status === 406) {
                return { data: null, error: null };
             }
             const text = await response.text();
             return { data: null, error: new Error(`REST_ERROR: ${response.status} - ${text}`) };
          }
          const text = await response.text();
          const data = text ? JSON.parse(text) : null;
          return { data, error: null };
        },
        maybeSingle: async () => {
          queryBuilder._single = true;
          const result = await (queryBuilder.single as any)();
          if (result.error && result.error?.message?.includes("406")) {
            return { data: null, error: null };
          }
          return result;
        },
        then: function(resolve: any, reject: any) {
          // This allows the query builder itself to be awaited to fetch an array of rows
          const execute = async () => {
            const url = new URL(`${supabaseUrl}/rest/v1/${targetTable}`);
            if (queryBuilder._select) url.searchParams.set('select', queryBuilder._select);
            queryBuilder._filters.forEach(f => {
              const [k, v] = f.split('=');
              url.searchParams.set(k, v);
            });
            if (queryBuilder._order) url.searchParams.set('order', queryBuilder._order);
            if (queryBuilder._limit) url.searchParams.set('limit', queryBuilder._limit);

            const headers: any = { ...defaultHeaders };
            if (targetSchema) {
              headers['Accept-Profile'] = targetSchema;
              headers['Content-Profile'] = targetSchema;
            }
            
            const response = await fetch(url.toString(), {
              method: queryBuilder._operation ? (queryBuilder._operation === 'insert' ? 'POST' : queryBuilder._operation === 'delete' ? 'DELETE' : 'PATCH') : 'GET',
            headers,
            body: queryBuilder._values ? JSON.stringify(queryBuilder._values) : undefined
            });

            if (!response.ok) {
              const text = await response.text();
              return { data: null, error: new Error(`REST_ERROR: ${response.status} - ${text}`) };
            }
            const text = await response.text();
            const data = text ? JSON.parse(text) : [];
            return { data, error: null };
          };
          execute().then(resolve).catch(reject);
        }
      };
      return queryBuilder;
    },
    schema: (schemaName: string) => {
      return {
        from: (tableName: string) => {
          return client.from(`${schemaName}.${tableName}`);
        }
      };
    }
  };

  return client;
}
